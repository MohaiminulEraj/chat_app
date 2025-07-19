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
            this.logger.log(`User ${userId} has ${conversations.length} existing conversations`)
            conversations.forEach((conv) => {
                client.join(`conversation:${conv.uuid}`)
                this.logger.log(`User ${userId} joined conversation room: ${conv.uuid}`)
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
            this.logger.log(`User ${senderId} attempting to send message`)
            
            // Get or create conversation
            let conversation
            if (data.conversationId) {
                this.logger.log(`Using existing conversation: ${data.conversationId}`)
                conversation = await this.conversationService.getConversation(
                    data.conversationId
                )
            } else if (data.recipientId) {
                this.logger.log(`Creating/getting conversation between ${senderId} and ${data.recipientId}`)
                conversation =
                    await this.conversationService.getOrCreateDirectConversation(
                        senderId,
                        data.recipientId
                    )
                this.logger.log(`Conversation resolved: ${conversation.uuid}, participants: ${conversation.participantIds.join(', ')}`)
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

            // Ensure all participants are in the conversation room
            conversation.participantIds.forEach((participantId) => {
                const participantSocketId = this.userSocketMap.get(participantId)
                if (participantSocketId) {
                    const participantSocket = this.server.sockets.sockets.get(participantSocketId)
                    if (participantSocket) {
                        participantSocket.join(`conversation:${conversation.uuid}`)
                        this.logger.log(`Added participant ${participantId} to conversation room ${conversation.uuid}`)
                    }
                }
            })

            // Emit message to all participants
            this.logger.log(`Emitting newMessage to conversation room: conversation:${conversation.uuid}`)
            this.server
                .to(`conversation:${conversation.uuid}`)
                .emit('newMessage', {
                    conversation: conversation.uuid,
                    message: {
                        ...message,
                        senderName: client['user'].email || 'Unknown User' // Add sender name for better identification
                    }
                })

            // Also emit to individual user rooms as fallback
            this.logger.log(`Emitting newMessage to individual participant rooms`)
            conversation.participantIds.forEach((participantId) => {
                if (participantId !== senderId) { // Don't send to sender
                    this.logger.log(`Emitting to user room: user:${participantId}`)
                    this.server
                        .to(`user:${participantId}`)
                        .emit('newMessage', {
                            conversation: conversation.uuid,
                            message: {
                                ...message,
                                senderName: client['user'].email || 'Unknown User'
                            }
                        })
                }
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

        @UseGuards(WsJwtGuard)
    @SubscribeMessage('joinConversation')
    async handleJoinConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string }
    ) {
        try {
            const userId = client['user'].uuid
            
            // Verify user is participant
            const conversation = await this.conversationService.getConversation(data.conversationId)
            if (!conversation.participantIds.includes(userId)) {
                return { success: false, error: 'Access denied' }
            }
            
            client.join(`conversation:${data.conversationId}`)
            this.logger.log(`User ${userId} joined conversation ${data.conversationId}`)
            
            return { success: true, conversationId: data.conversationId }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('leaveConversation')
    async handleLeaveConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string }
    ) {
        try {
            const userId = client['user'].uuid
            client.leave(`conversation:${data.conversationId}`)
            this.logger.log(`User ${userId} left conversation ${data.conversationId}`)
            
            return { success: true, conversationId: data.conversationId }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('getConversationHistory')
    async handleGetConversationHistory(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { 
            conversationId?: string
            recipientId?: string
            limit?: number
            before?: string 
        }
    ) {
        try {
            const userId = client['user'].uuid
            let conversationId = data.conversationId

            // If no conversationId but recipientId provided, get or create conversation
            if (!conversationId && data.recipientId) {
                const conversation = await this.conversationService.getOrCreateDirectConversation(
                    userId,
                    data.recipientId
                )
                conversationId = conversation.uuid
            }

            if (!conversationId) {
                return { success: false, error: 'conversationId or recipientId required' }
            }

            const messages = await this.conversationService.getMessages(
                conversationId,
                userId,
                data.limit || 50,
                data.before
            )

            // Auto-join conversation room when fetching history
            client.join(`conversation:${conversationId}`)

            return { 
                success: true, 
                conversationId,
                messages,
                hasMore: messages.length === (data.limit || 50)
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('getUserConversations')
    async handleGetUserConversations(
        @ConnectedSocket() client: Socket
    ) {
        try {
            const userId = client['user'].uuid
            const conversations = await this.conversationService.getUserConversations(userId)

            // Auto-join all conversation rooms
            conversations.forEach(conv => {
                client.join(`conversation:${conv.uuid}`)
            })

            return { 
                success: true, 
                conversations 
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
}
