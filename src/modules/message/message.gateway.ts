import { Logger, UseGuards } from '@nestjs/common'
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
import { CreateMessageDto } from './dto/create-message.dto'
import { MessageService } from './message.service'

@WebSocketGateway({
    namespace: 'messages',
    cors: {
        origin: '*'
    }
})
@UseGuards(WsJwtGuard)
export class MessageGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    private readonly logger = new Logger(MessageGateway.name)

    @WebSocketServer()
    server: Server

    constructor(private readonly messageService: MessageService) {}

    async handleConnection(client: Socket) {
        const connectionTime = new Date().toISOString()
        const userId = client.data.userId
        const userInfo = client.data.user || {}

        this.logger.log(
            `🔗 [MESSAGE_CONNECTION] New client connected to messages namespace`
        )
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${userInfo.username || 'Unknown'} (${userId || 'No ID'})`
        )
        this.logger.log(`   ├─ IP: ${client.handshake.address}`)
        this.logger.log(
            `   ├─ User Agent: ${client.handshake.headers['user-agent'] || 'Unknown'}`
        )
        this.logger.log(`   └─ Connection Time: ${connectionTime}`)

        if (userId) {
            try {
                // Join user's personal room
                client.join(`user:${userId}`)
                this.logger.log(`🏠 [ROOM_JOIN] User joined personal room`)
                this.logger.log(`   ├─ User ID: ${userId}`)
                this.logger.log(`   └─ Room: user:${userId}`)

                // Join conversation rooms
                const conversations =
                    await this.messageService.getUserConversations(userId)
                this.logger.log(`💬 [CONVERSATIONS] Loading user conversations`)
                this.logger.log(`   ├─ User ID: ${userId}`)
                this.logger.log(
                    `   └─ Conversations Found: ${conversations.length}`
                )

                conversations.forEach((conv) => {
                    client.join(`conversation:${conv.id}`)
                    this.logger.log(`🏠 [ROOM_JOIN] Joined conversation room`)
                    this.logger.log(`   ├─ Conversation ID: ${conv.id}`)
                    this.logger.log(`   └─ Room: conversation:${conv.id}`)
                })

                // Update user status
                this.server.emit('userStatusUpdate', {
                    userId,
                    status: 'online'
                })
                this.logger.log(
                    `📢 [STATUS_UPDATE] Broadcasting user online status`
                )
                this.logger.log(`   ├─ User ID: ${userId}`)
                this.logger.log(`   ├─ Status: online`)
                this.logger.log(`   └─ Broadcast: Global`)
            } catch (error) {
                this.logger.error(
                    `❌ [CONNECTION_ERROR] Failed to setup user connection`
                )
                this.logger.error(`   ├─ User ID: ${userId}`)
                this.logger.error(`   ├─ Error: ${error.message}`)
                this.logger.error(`   └─ Stack: ${error.stack}`)

                client.emit('error', {
                    message: 'Failed to setup connection',
                    code: 'CONNECTION_SETUP_ERROR'
                })
            }
        } else {
            this.logger.warn(
                `⚠️ [CONNECTION_WARNING] Client connected without user ID`
            )
            this.logger.warn(`   ├─ Socket ID: ${client.id}`)
            this.logger.warn(`   └─ IP: ${client.handshake.address}`)
        }
    }

    async handleDisconnect(client: Socket) {
        const disconnectionTime = new Date().toISOString()
        const userId = client.data.userId
        const userInfo = client.data.user || {}

        this.logger.log(
            `🔌 [MESSAGE_DISCONNECTION] Client disconnected from messages namespace`
        )
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${userInfo.username || 'Unknown'} (${userId || 'No ID'})`
        )
        this.logger.log(`   ├─ IP: ${client.handshake.address}`)
        this.logger.log(`   └─ Disconnection Time: ${disconnectionTime}`)

        if (userId) {
            try {
                this.server.emit('userStatusUpdate', {
                    userId,
                    status: 'offline'
                })
                this.logger.log(
                    `📢 [STATUS_UPDATE] Broadcasting user offline status`
                )
                this.logger.log(`   ├─ User ID: ${userId}`)
                this.logger.log(`   ├─ Status: offline`)
                this.logger.log(`   └─ Broadcast: Global`)
            } catch (error) {
                this.logger.error(
                    `❌ [DISCONNECTION_ERROR] Failed to update user status`
                )
                this.logger.error(`   ├─ User ID: ${userId}`)
                this.logger.error(`   ├─ Error: ${error.message}`)
                this.logger.error(`   └─ Stack: ${error.stack}`)
            }
        }
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() createMessageDto: CreateMessageDto
    ) {
        const timestamp = new Date().toISOString()
        const userId = client.data.userId
        const userInfo = client.data.user || {}

        this.logger.log(`💬 [SEND_MESSAGE] Message sending initiated`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ Sender: ${userInfo.username || 'Unknown'} (${userId})`
        )
        this.logger.log(
            `   ├─ Conversation ID: ${createMessageDto.conversationId}`
        )
        this.logger.log(
            `   ├─ Message Type: ${createMessageDto.type || 'text'}`
        )
        this.logger.log(
            `   ├─ Content Length: ${createMessageDto.content?.length || 0} characters`
        )
        this.logger.log(`   └─ Timestamp: ${timestamp}`)

        try {
            const message = await this.messageService.createMessage(
                userId,
                createMessageDto
            )

            this.logger.log(`✅ [MESSAGE_CREATED] Message successfully created`)
            this.logger.log(
                `   ├─ Message ID: ${(message as any)._id || 'Generated'}`
            )
            this.logger.log(`   ├─ Sender: ${userId}`)
            this.logger.log(`   ├─ Conversation: ${message.conversationId}`)
            this.logger.log(`   ├─ Type: ${message.type || 'text'}`)
            this.logger.log(`   └─ Created At: ${message.createdAt}`)

            // Emit to all participants in the conversation
            const roomName = `conversation:${message.conversationId}`
            this.server.to(roomName).emit('newMessage', message)

            this.logger.log(
                `📢 [MESSAGE_BROADCAST] Message broadcasted to conversation`
            )
            this.logger.log(
                `   ├─ Message ID: ${(message as any)._id || 'Generated'}`
            )
            this.logger.log(`   ├─ Room: ${roomName}`)
            this.logger.log(`   ├─ Event: newMessage`)
            this.logger.log(`   └─ Broadcast Time: ${new Date().toISOString()}`)

            return message
        } catch (error) {
            this.logger.error(`❌ [MESSAGE_ERROR] Failed to send message`)
            this.logger.error(`   ├─ User ID: ${userId}`)
            this.logger.error(
                `   ├─ Conversation ID: ${createMessageDto.conversationId}`
            )
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   └─ Stack: ${error.stack}`)

            client.emit('error', {
                message: 'Failed to send message',
                code: 'MESSAGE_SEND_ERROR',
                timestamp: new Date().toISOString()
            })

            throw error
        }
    }

    @SubscribeMessage('typing')
    handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string; isTyping: boolean }
    ) {
        const timestamp = new Date().toISOString()
        const userId = client.data.userId
        const userInfo = client.data.user || {}

        this.logger.log(`⌨️ [TYPING_INDICATOR] Typing indicator event`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${userInfo.username || 'Unknown'} (${userId})`
        )
        this.logger.log(`   ├─ Conversation ID: ${data.conversationId}`)
        this.logger.log(`   ├─ Is Typing: ${data.isTyping}`)
        this.logger.log(`   └─ Timestamp: ${timestamp}`)

        try {
            const roomName = `conversation:${data.conversationId}`
            client.to(roomName).emit('userTyping', {
                userId,
                conversationId: data.conversationId,
                isTyping: data.isTyping,
                timestamp: timestamp
            })

            this.logger.log(
                `📢 [TYPING_BROADCAST] Typing indicator broadcasted`
            )
            this.logger.log(`   ├─ User ID: ${userId}`)
            this.logger.log(`   ├─ Room: ${roomName}`)
            this.logger.log(`   ├─ Is Typing: ${data.isTyping}`)
            this.logger.log(`   └─ Event: userTyping`)
        } catch (error) {
            this.logger.error(
                `❌ [TYPING_ERROR] Failed to handle typing indicator`
            )
            this.logger.error(`   ├─ User ID: ${userId}`)
            this.logger.error(`   ├─ Conversation ID: ${data.conversationId}`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   └─ Stack: ${error.stack}`)

            client.emit('error', {
                message: 'Failed to handle typing indicator',
                code: 'TYPING_ERROR',
                timestamp: new Date().toISOString()
            })
        }
    }

    @SubscribeMessage('markAsRead')
    async handleMarkAsRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { messageIds: string[] }
    ) {
        const timestamp = new Date().toISOString()
        const userId = client.data.userId
        const userInfo = client.data.user || {}

        this.logger.log(`📖 [MARK_AS_READ] Mark messages as read initiated`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${userInfo.username || 'Unknown'} (${userId})`
        )
        this.logger.log(`   ├─ Message Count: ${data.messageIds?.length || 0}`)
        this.logger.log(
            `   ├─ Message IDs: ${data.messageIds?.slice(0, 3).join(', ')}${data.messageIds?.length > 3 ? '...' : ''}`
        )
        this.logger.log(`   └─ Timestamp: ${timestamp}`)

        try {
            await this.messageService.markMessagesAsRead(
                userId,
                data.messageIds
            )

            this.logger.log(
                `✅ [MESSAGES_MARKED_READ] Messages successfully marked as read`
            )
            this.logger.log(`   ├─ User ID: ${userId}`)
            this.logger.log(`   ├─ Messages Count: ${data.messageIds.length}`)
            this.logger.log(`   └─ Processed At: ${new Date().toISOString()}`)

            // Notify sender about read receipt
            data.messageIds.forEach((messageId) => {
                this.server.emit('messageRead', {
                    messageId,
                    userId,
                    timestamp: new Date().toISOString()
                })

                this.logger.log(`📢 [READ_RECEIPT] Read receipt broadcasted`)
                this.logger.log(`   ├─ Message ID: ${messageId}`)
                this.logger.log(`   ├─ Reader: ${userId}`)
                this.logger.log(`   ├─ Event: messageRead`)
                this.logger.log(`   └─ Global Broadcast: Yes`)
            })
        } catch (error) {
            this.logger.error(
                `❌ [MARK_READ_ERROR] Failed to mark messages as read`
            )
            this.logger.error(`   ├─ User ID: ${userId}`)
            this.logger.error(
                `   ├─ Message Count: ${data.messageIds?.length || 0}`
            )
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   └─ Stack: ${error.stack}`)

            client.emit('error', {
                message: 'Failed to mark messages as read',
                code: 'MARK_READ_ERROR',
                timestamp: new Date().toISOString()
            })

            throw error
        }
    }

    @SubscribeMessage('joinConversation')
    async handleJoinConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() conversationId: string
    ) {
        const timestamp = new Date().toISOString()
        const userId = client.data.userId
        const userInfo = client.data.user || {}

        this.logger.log(`🚪 [JOIN_CONVERSATION] User joining conversation`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${userInfo.username || 'Unknown'} (${userId})`
        )
        this.logger.log(`   ├─ Conversation ID: ${conversationId}`)
        this.logger.log(`   └─ Timestamp: ${timestamp}`)

        try {
            const roomName = `conversation:${conversationId}`
            client.join(roomName)

            this.logger.log(
                `✅ [CONVERSATION_JOINED] Successfully joined conversation`
            )
            this.logger.log(`   ├─ User ID: ${userId}`)
            this.logger.log(`   ├─ Conversation ID: ${conversationId}`)
            this.logger.log(`   ├─ Room: ${roomName}`)
            this.logger.log(`   └─ Joined At: ${new Date().toISOString()}`)

            // Notify other participants
            client.to(roomName).emit('userJoinedConversation', {
                userId,
                conversationId,
                timestamp: new Date().toISOString()
            })

            this.logger.log(
                `📢 [USER_JOINED_BROADCAST] User join broadcasted to conversation`
            )
            this.logger.log(`   ├─ User ID: ${userId}`)
            this.logger.log(`   ├─ Room: ${roomName}`)
            this.logger.log(`   ├─ Event: userJoinedConversation`)
            this.logger.log(`   └─ Broadcast: Room participants`)

            return {
                status: 'joined',
                conversationId,
                timestamp: new Date().toISOString()
            }
        } catch (error) {
            this.logger.error(
                `❌ [JOIN_CONVERSATION_ERROR] Failed to join conversation`
            )
            this.logger.error(`   ├─ User ID: ${userId}`)
            this.logger.error(`   ├─ Conversation ID: ${conversationId}`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   └─ Stack: ${error.stack}`)

            client.emit('error', {
                message: 'Failed to join conversation',
                code: 'JOIN_CONVERSATION_ERROR',
                timestamp: new Date().toISOString()
            })

            throw error
        }
    }

    @SubscribeMessage('leaveConversation')
    handleLeaveConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() conversationId: string
    ) {
        const timestamp = new Date().toISOString()
        const userId = client.data.userId
        const userInfo = client.data.user || {}

        this.logger.log(`🚪 [LEAVE_CONVERSATION] User leaving conversation`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${userInfo.username || 'Unknown'} (${userId})`
        )
        this.logger.log(`   ├─ Conversation ID: ${conversationId}`)
        this.logger.log(`   └─ Timestamp: ${timestamp}`)

        try {
            const roomName = `conversation:${conversationId}`

            // Notify other participants before leaving
            client.to(roomName).emit('userLeftConversation', {
                userId,
                conversationId,
                timestamp: new Date().toISOString()
            })

            this.logger.log(
                `📢 [USER_LEFT_BROADCAST] User leave broadcasted to conversation`
            )
            this.logger.log(`   ├─ User ID: ${userId}`)
            this.logger.log(`   ├─ Room: ${roomName}`)
            this.logger.log(`   ├─ Event: userLeftConversation`)
            this.logger.log(`   └─ Broadcast: Room participants`)

            client.leave(roomName)

            this.logger.log(
                `✅ [CONVERSATION_LEFT] Successfully left conversation`
            )
            this.logger.log(`   ├─ User ID: ${userId}`)
            this.logger.log(`   ├─ Conversation ID: ${conversationId}`)
            this.logger.log(`   ├─ Room: ${roomName}`)
            this.logger.log(`   └─ Left At: ${new Date().toISOString()}`)

            return {
                status: 'left',
                conversationId,
                timestamp: new Date().toISOString()
            }
        } catch (error) {
            this.logger.error(
                `❌ [LEAVE_CONVERSATION_ERROR] Failed to leave conversation`
            )
            this.logger.error(`   ├─ User ID: ${userId}`)
            this.logger.error(`   ├─ Conversation ID: ${conversationId}`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   └─ Stack: ${error.stack}`)

            client.emit('error', {
                message: 'Failed to leave conversation',
                code: 'LEAVE_CONVERSATION_ERROR',
                timestamp: new Date().toISOString()
            })

            return {
                status: 'error',
                conversationId,
                error: error.message,
                timestamp: new Date().toISOString()
            }
        }
    }
}
