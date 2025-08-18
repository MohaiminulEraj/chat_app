import { Logger } from '@nestjs/common'
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
import { ConversationService } from './conversation.service'
import { MessageType } from './entities/message.entity'

@WebSocketGateway({
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
})
export class ConversationGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server

    private readonly logger = new Logger(ConversationGateway.name)
    private userSocketMap = new Map<string, string>() // userId -> socketId
    private socketUserMap = new Map<string, string>() // socketId -> userId

    constructor(
        private conversationService: ConversationService,
        private jwtService: JwtService
    ) {}

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

            // Use the injected JWT service
            const payload = await this.jwtService.verifyAsync(data.token)

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
            this.logger.log(
                `User ${userId} has ${conversations.length} existing conversations`
            )
            conversations.forEach((conv) => {
                client.join(`conversation:${conv.uuid}`)
                this.logger.log(
                    `User ${userId} joined conversation room: ${conv.uuid}`
                )
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

    // @UseGuards(WsJwtGuard)
    @SubscribeMessage('sendMessage')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            conversationId?: string
            senderId?: string
            recipientId?: string
            type: MessageType
            content?: string
            fileUrl?: string
            replyTo?: string
        }
    ) {
        // Ensure senderId is provided since no authentication
        if (!data.senderId) {
            this.logger.error(
                `No senderId provided for message from client ${client.id}`
            )
            client.emit('sendMessageResponse', {
                success: false,
                error: 'senderId is required'
            })
            return { success: false, error: 'senderId is required' }
        }

        const senderId = data.senderId

        try {
            this.logger.log(`User ${senderId} attempting to send message`)
            this.logger.log(`Raw data received: ${JSON.stringify(data)}`)
            this.logger.log(
                `conversationId type: ${typeof data.conversationId}`
            )
            this.logger.log(`conversationId value: "${data.conversationId}"`)

            // Get or create conversation
            let conversation
            if (
                data.conversationId &&
                data.conversationId !== 'undefined' &&
                data.conversationId !== 'string'
            ) {
                this.logger.log(
                    `Using existing conversation: ${data.conversationId}`
                )
                conversation = await this.conversationService.getConversation(
                    data.conversationId
                )
            } else if (data.recipientId) {
                this.logger.log(
                    `Creating/getting conversation between ${senderId} and ${data.recipientId}`
                )
                conversation =
                    await this.conversationService.getOrCreateDirectConversation(
                        senderId,
                        data.recipientId
                    )
                this.logger.log(
                    `Conversation resolved: ${conversation.uuid}, participants: ${conversation.participantIds.join(', ')}`
                )
            } else {
                throw new Error(
                    'Either conversationId or recipientId is required'
                )
            }

            // Get sender's full profile information
            const senderProfile =
                await this.conversationService.getUserProfile(senderId)

            // Save message to PostgreSQL
            const message = await this.conversationService.createMessage({
                conversationId: conversation.uuid,
                senderId,
                type: data.type,
                content: data.content,
                fileUrl: data.fileUrl,
                replyTo: data.replyTo
            })

            // Create enhanced message with sender profile in specified format
            const enhancedMessage = {
                _id: message.id,
                sender: {
                    _id: senderId,
                    name:
                        senderProfile.displayName ||
                        senderProfile.name ||
                        'Unknown User',
                    role: 'member' // Default role, can be enhanced based on conversation permissions
                },
                content: message.content || '',
                avatar: senderProfile.avatarUrl || '',
                createdAt: message.createdAt,
                updatedAt: message.updatedAt,
                __v: 0
            }

            // Ensure all participants are in the conversation room
            conversation.participantIds.forEach((participantId) => {
                const participantSocketId =
                    this.userSocketMap.get(participantId)
                if (participantSocketId) {
                    const participantSocket =
                        this.server.sockets.sockets.get(participantSocketId)
                    if (participantSocket) {
                        participantSocket.join(
                            `conversation:${conversation.uuid}`
                        )
                        this.logger.log(
                            `Added participant ${participantId} to conversation room ${conversation.uuid}`
                        )
                    }
                }
            })

            // Emit message to all participants with sender profile
            this.logger.log(
                `Emitting newMessage to conversation room: conversation:${conversation.uuid}`
            )
            this.server
                .to(`conversation:${conversation.uuid}`)
                .emit('newMessage', {
                    conversation: conversation.uuid,
                    message: enhancedMessage
                })

            // Also emit to individual user rooms as fallback
            this.logger.log(
                `Emitting newMessage to individual participant rooms`
            )
            conversation.participantIds.forEach((participantId) => {
                if (participantId !== senderId) {
                    // Don't send to sender
                    this.logger.log(
                        `Emitting to user room: user:${participantId}`
                    )
                    this.server.to(`user:${participantId}`).emit('newMessage', {
                        conversation: conversation.uuid,
                        message: enhancedMessage
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

            // Emit sendMessageResponse to the sender
            this.logger.log(
                `Emitting sendMessageResponse to sender: ${senderId}`
            )
            client.emit('sendMessageResponse', {
                success: true,
                message: enhancedMessage
            })

            return { success: true }
        } catch (error) {
            this.logger.error(`Send message failed: ${error.message}`)

            // Emit error response to the sender
            client.emit('sendMessageResponse', {
                success: false,
                error: error.message
            })

            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('markAsRead')
    async handleMarkAsRead(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            conversationId: string
            messageIds: string[]
            userId: string
        }
    ) {
        if (!data.userId) {
            return { success: false, error: 'userId is required' }
        }

        const userId = data.userId

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

    @SubscribeMessage('typing')
    async handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            conversationId: string
            isTyping: boolean
            userId: string
        }
    ) {
        if (!data.userId) {
            return { success: false, error: 'userId is required' }
        }

        const userId = data.userId

        // Broadcast typing status to other participants
        client.to(`conversation:${data.conversationId}`).emit('userTyping', {
            conversationId: data.conversationId,
            userId,
            isTyping: data.isTyping
        })

        return { success: true }
    }

    @SubscribeMessage('deleteMessage')
    async handleDeleteMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            conversationId: string
            messageId: string
            userId: string
        }
    ) {
        if (!data.userId) {
            return { success: false, error: 'userId is required' }
        }

        const userId = data.userId

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

    @SubscribeMessage('editMessage')
    async handleEditMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            conversationId: string
            messageId: string
            newContent: string
            userId: string
        }
    ) {
        if (!data.userId) {
            return { success: false, error: 'userId is required' }
        }

        const userId = data.userId

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

    @SubscribeMessage('joinConversation')
    async handleJoinConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string; userId: string }
    ) {
        try {
            if (!data.userId) {
                return { success: false, error: 'userId is required' }
            }

            const userId = data.userId

            // Verify user is participant
            const conversation = await this.conversationService.getConversation(
                data.conversationId
            )
            if (!conversation.participantIds.includes(userId)) {
                return { success: false, error: 'Access denied' }
            }

            client.join(`conversation:${data.conversationId}`)
            this.logger.log(
                `User ${userId} joined conversation ${data.conversationId}`
            )

            return { success: true, conversationId: data.conversationId }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('leaveConversation')
    async handleLeaveConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string; userId: string }
    ) {
        try {
            if (!data.userId) {
                return { success: false, error: 'userId is required' }
            }

            const userId = data.userId
            client.leave(`conversation:${data.conversationId}`)
            this.logger.log(
                `User ${userId} left conversation ${data.conversationId}`
            )

            return { success: true, conversationId: data.conversationId }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('getConversationHistory')
    async handleGetConversationHistory(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            conversationId?: string
            recipientId?: string
            userId: string
        }
    ) {
        try {
            if (!data.userId) {
                return { success: false, error: 'userId is required' }
            }

            const userId = data.userId
            let conversationId = data.conversationId

            // If no conversationId but recipientId provided, get or create conversation
            if (!conversationId && data.recipientId) {
                const conversation =
                    await this.conversationService.getOrCreateDirectConversation(
                        userId,
                        data.recipientId
                    )
                conversationId = conversation.uuid
            }

            if (!conversationId) {
                return {
                    success: false,
                    error: 'conversationId or recipientId required'
                }
            }

            const messages = await this.conversationService.getMessages(
                conversationId,
                userId
            )

            // Auto-join conversation room when fetching history
            client.join(`conversation:${conversationId}`)

            return {
                success: true,
                conversationId,
                messages,
                hasMore: false // No pagination, so no more messages
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('getUserConversations')
    async handleGetUserConversations(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userId: string }
    ) {
        try {
            if (!data.userId) {
                return { success: false, error: 'userId is required' }
            }

            const userId = data.userId
            const conversations =
                await this.conversationService.getUserConversations(userId)

            // Auto-join all conversation rooms
            conversations.forEach((conv) => {
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
