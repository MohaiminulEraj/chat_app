import { Logger } from '@nestjs/common'
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
import { GroupChatService } from './group-chat.service'

interface AuthenticatedSocket extends Socket {
    // Optional user info that can be set for convenience
}

@WebSocketGateway({
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    namespace: 'group-chat',
    transports: ['websocket', 'polling']
})
export class GroupChatGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server

    private logger = new Logger('GroupChatGateway')

    constructor(private readonly groupChatService: GroupChatService) {}

    async handleConnection(client: AuthenticatedSocket) {
        this.logger.log(`Client connected: ${client.id}`)
    }

    async handleDisconnect(client: AuthenticatedSocket) {
        this.logger.log(`Client disconnected: ${client.id}`)
    }

    @SubscribeMessage('sendGroupMessage')
    async handleSendMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            group: string
            avatar: string | null
            sender: {
                _id: string
                name: string
                role: string | null
            }
            content: string
            createdAt: string
            updatedAt: string | null
            __v: number | null
            type: string | null
        }
    ) {
        try {
            const { group: groupId, avatar, sender, content, type } = data

            // Validate required fields
            if (!groupId || !sender?._id || !content) {
                client.emit('sendGroupMessageResponse', {
                    error: 'Missing required fields: group, sender._id, or content',
                    success: false
                })
                return
            }

            // Get sender's information from payload
            const senderId = sender._id
            const senderName = sender.name

            this.logger.log(
                `Processing message from ${senderId} to group ${groupId}`
            )

            // Get user's actual role from database instead of relying on payload
            const userRole = await this.groupChatService.getUserRole(
                groupId,
                senderId
            )
            const senderRole = userRole || 'member'

            // Save message to PostgreSQL
            const message = await this.groupChatService.saveGroupMessage({
                senderId: senderId,
                senderName: senderName,
                senderAvatarUrl: avatar || '',
                groupId: groupId,
                content: content,
                messageType: type || 'text',
                metadata: {},
                replyToMessageId: undefined
            })

            // Create response in the specified format
            const response = {
                _id: message.id,
                group: groupId,
                sender: {
                    _id: senderId,
                    name: senderName,
                    role: senderRole
                },
                content: content,
                avatar: avatar || '',
                createdAt: message.timestamp,
                updatedAt: message.updatedAt || message.timestamp,
                __v: 0,
                userRole: senderRole, // Add user's actual group role
                success: true
            }

            // Send response to the sender
            client.emit('sendGroupMessageResponse', response)

            // Broadcast the message to all other members in the group room
            this.server
                .to(`group:${groupId}`)
                .emit('sendGroupMessageResponse', response)

            this.logger.log(
                `Group message sent by ${senderId} (${senderRole}) to group ${groupId} - Message ID: ${message.id}`
            )
        } catch (error) {
            this.logger.error('Error sending group message:', error.message)
            this.logger.error('Stack trace:', error.stack)
            client.emit('sendGroupMessageResponse', {
                error: 'Failed to send message',
                message: error.message,
                success: false
            })
        }
    }

    @SubscribeMessage('getGroupMessageHistory')
    async getGroupMessageHistory(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            groupId: string
            userId: string
            // page?: number
            // limit?: number
            // before?: string // messageId to get messages before this
        }
    ) {
        try {
            const {
                groupId,
                userId
                // page = 1,
                // limit = 50,
                // before
            } = data

            if (!userId) {
                client.emit('error', { message: 'User ID is required' })
                return
            }

            const messages = await this.groupChatService.getGroupMessageHistory(
                groupId
                // page,
                // limit,
                // before
            )

            client.emit('groupMessageHistory', {
                groupId,
                messages
                // page,
                // limit,
                // hasMore: messages.length === limit
            })
        } catch (error) {
            this.logger.error('Error getting message history:', error.message)
            client.emit('error', { message: 'Failed to get message history' })
        }
    }

    @SubscribeMessage('markGroupMessageAsRead')
    async handleMarkAsRead(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            groupId: string
            messageIds: string[]
            userId: string
            userName: string
        }
    ) {
        try {
            const { groupId, messageIds, userId, userName } = data

            if (!userId) return

            await this.groupChatService.markMessagesAsRead(
                groupId,
                messageIds,
                userId
            )

            // Notify other group members about read status
            client.to(`group:${groupId}`).emit('messagesMarkedAsRead', {
                groupId,
                messageIds,
                readBy: userId,
                userName: userName
            })
        } catch (error) {
            this.logger.error('Error marking messages as read:', error.message)
        }
    }

    @SubscribeMessage('groupTyping')
    async handleTyping(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            groupId: string
            isTyping: boolean
            userId: string
            userName: string
        }
    ) {
        const { groupId, isTyping, userId, userName } = data

        if (!userId) return

        client.to(`group:${groupId}`).emit('userTypingInGroup', {
            groupId,
            userId: userId,
            userName: userName,
            isTyping
        })
    }

    @SubscribeMessage('deleteGroupMessage')
    async handleDeleteMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: { groupId: string; messageId: string; userId: string }
    ) {
        try {
            const { groupId, messageId, userId } = data

            if (!userId) {
                client.emit('error', { message: 'User ID is required' })
                return
            }

            const success = await this.groupChatService.deleteMessage(
                groupId,
                messageId,
                userId
            )

            if (success) {
                this.server.to(`group:${groupId}`).emit('groupMessageDeleted', {
                    groupId,
                    messageId,
                    deletedBy: userId
                })
            } else {
                client.emit('error', { message: 'Cannot delete this message' })
            }
        } catch (error) {
            this.logger.error('Error deleting message:', error.message)
            client.emit('error', { message: 'Failed to delete message' })
        }
    }

    @SubscribeMessage('editGroupMessage')
    async handleEditMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            groupId: string
            messageId: string
            newContent: string
            userId: string
        }
    ) {
        try {
            const { groupId, messageId, newContent, userId } = data

            if (!userId) {
                client.emit('error', { message: 'User ID is required' })
                return
            }

            const updatedMessage = await this.groupChatService.editMessage(
                groupId,
                messageId,
                newContent,
                userId
            )

            if (updatedMessage) {
                this.server.to(`group:${groupId}`).emit('groupMessageEdited', {
                    groupId,
                    messageId,
                    newContent,
                    editedBy: userId,
                    editedAt: updatedMessage.editedAt
                })
            } else {
                client.emit('error', { message: 'Cannot edit this message' })
            }
        } catch (error) {
            this.logger.error('Error editing message:', error.message)
            client.emit('error', { message: 'Failed to edit message' })
        }
    }
}
