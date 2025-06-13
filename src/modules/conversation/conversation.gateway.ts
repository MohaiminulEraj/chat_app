import { Logger, UseGuards } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard'
import { ConversationService } from './conversation.service'
import { MessageType } from './schemas/message.schema'

@WebSocketGateway({
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    namespace: 'chat',
    transports: ['websocket', 'polling'],
    path: '/socket.io/' // Make sure path is standard
})
export class ConversationGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server

    private readonly logger = new Logger(ConversationGateway.name)
    private userSocketMap = new Map<string, string>() // userId -> socketId
    private socketUserMap = new Map<string, string>() // socketId -> userId

    constructor(private conversationService: ConversationService) {}

    async handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`)
        try {
            // Send immediate response to confirm connection
            client.emit('connected', {
                success: true,
                message: 'Connected to chat server'
            })
        } catch (error) {
            this.logger.error(`Error in handleConnection: ${error.message}`)
        }
    }

    async handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`)
        const userId = this.socketUserMap.get(client.id)
        if (userId) {
            this.userSocketMap.delete(userId)
            this.socketUserMap.delete(client.id)

            // Update user status to offline
            await this.conversationService.updateUserStatus(userId, 'offline')

            // Notify friends about offline status
            this.server.emit('userStatusChanged', {
                userId,
                status: 'offline'
            })
        }
    }

    @SubscribeMessage('authenticate')
    async handleAuthenticate(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { token: string }
    ) {
        try {
            this.logger.log(`Authenticating client: ${client.id}`)

            // Manually verify JWT if guard is not working
            const jwtService = new JwtService({
                secret: process.env.JWT_SECRET || 'your-secret-key'
            })
            const payload = await jwtService.verifyAsync(data.token)

            const userId = payload.uuid
            client['user'] = payload

            // Store user-socket mapping
            this.userSocketMap.set(userId, client.id)
            this.socketUserMap.set(client.id, userId)

            // Join user's personal room
            client.join(`user:${userId}`)

            // Join all user's conversations
            const conversations =
                await this.conversationService.getUserConversations(userId)
            conversations.forEach((conv) => {
                client.join(`conversation:${conv.uuid}`)
            })

            // Update user status to online
            await this.conversationService.updateUserStatus(userId, 'online')

            // Notify friends about online status
            this.server.emit('userStatusChanged', {
                userId,
                status: 'online'
            })

            this.logger.log(`User ${userId} authenticated successfully`)
            return { success: true, userId }
        } catch (error) {
            this.logger.error(`Authentication failed: ${error.message}`)
            return { success: false, error: error.message }
        }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('sendMessage')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            conversationId?: string
            recipientId?: string
            type: MessageType
            content?: string
            fileUrl?: string
            replyTo?: string
        }
    ) {
        const senderId = client['user'].uuid

        try {
            // Get or create conversation
            let conversation
            if (data.conversationId) {
                conversation = await this.conversationService.getConversation(
                    data.conversationId
                )
            } else if (data.recipientId) {
                conversation =
                    await this.conversationService.getOrCreateDirectConversation(
                        senderId,
                        data.recipientId
                    )
            } else {
                throw new Error(
                    'Either conversationId or recipientId is required'
                )
            }

            // Save message to MongoDB
            const message = await this.conversationService.createMessage({
                conversationId: conversation.uuid,
                senderId,
                type: data.type,
                content: data.content,
                fileUrl: data.fileUrl,
                replyTo: data.replyTo
            })

            // Emit message to all participants
            this.server
                .to(`conversation:${conversation.uuid}`)
                .emit('newMessage', {
                    conversation: conversation.uuid,
                    message
                })

            // Send push notification to offline users
            const offlineUsers =
                await this.conversationService.getOfflineParticipants(
                    conversation.uuid,
                    senderId
                )

            // TODO: Send push notifications to offline users

            return { success: true, message }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('markAsRead')
    async handleMarkAsRead(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            conversationId: string
            messageIds: string[]
        }
    ) {
        const userId = client['user'].uuid

        try {
            await this.conversationService.markMessagesAsRead(
                data.conversationId,
                data.messageIds,
                userId
            )

            // Notify sender about read status
            this.server
                .to(`conversation:${data.conversationId}`)
                .emit('messagesRead', {
                    conversationId: data.conversationId,
                    messageIds: data.messageIds,
                    readBy: userId
                })

            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('typing')
    async handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            conversationId: string
            isTyping: boolean
        }
    ) {
        const userId = client['user'].uuid

        // Broadcast typing status to other participants
        client.to(`conversation:${data.conversationId}`).emit('userTyping', {
            conversationId: data.conversationId,
            userId,
            isTyping: data.isTyping
        })

        return { success: true }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('deleteMessage')
    async handleDeleteMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            conversationId: string
            messageId: string
        }
    ) {
        const userId = client['user'].uuid

        try {
            await this.conversationService.deleteMessage(
                data.conversationId,
                data.messageId,
                userId
            )

            // Notify all participants
            this.server
                .to(`conversation:${data.conversationId}`)
                .emit('messageDeleted', {
                    conversationId: data.conversationId,
                    messageId: data.messageId
                })

            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('editMessage')
    async handleEditMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            conversationId: string
            messageId: string
            newContent: string
        }
    ) {
        const userId = client['user'].uuid

        try {
            const updatedMessage = await this.conversationService.editMessage(
                data.conversationId,
                data.messageId,
                userId,
                data.newContent
            )

            // Notify all participants
            this.server
                .to(`conversation:${data.conversationId}`)
                .emit('messageEdited', {
                    conversationId: data.conversationId,
                    message: updatedMessage
                })

            return { success: true, message: updatedMessage }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
}
