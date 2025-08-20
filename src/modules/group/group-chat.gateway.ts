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
    userId?: string
    userName?: string
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
        this.logger.log(
            `Client connected to group-chat namespace: ${client.id}`
        )

        // Send connection acknowledgment
        client.emit('connected', {
            success: true,
            message: 'Connected to Group Chat Gateway',
            socketId: client.id,
            namespace: 'group-chat',
            timestamp: new Date().toISOString()
        })
    }

    @SubscribeMessage('setup')
    async handleSetup(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { userId: string; userName?: string }
    ) {
        try {
            const { userId, userName } = data

            if (!userId) {
                client.emit('setupError', {
                    message: 'User ID is required',
                    success: false
                })
                return
            }

            client.emit('setupComplete', {
                success: true,
                userId,
                userName,
                message: 'Setup completed successfully'
            })

            this.logger.log(`Setup completed for user ${userId} (${userName})`)
        } catch (error) {
            this.logger.error('Error in setup:', error.message)
            client.emit('setupError', {
                message: 'Setup failed',
                success: false
            })
        }
    }

    async handleDisconnect(client: AuthenticatedSocket) {
        this.logger.log(`Client disconnected from group-chat: ${client.id}`)
    }

    @SubscribeMessage('joinGroup')
    async handleJoinGroup(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: { groupId: string; userId: string; userName?: string }
    ) {
        try {
            const { groupId, userId, userName } = data

            if (!groupId || !userId) {
                client.emit('error', {
                    message: 'Group ID and User ID are required'
                })
                return
            }

            // Join the group room
            client.join(`group:${groupId}`)

            this.logger.log(
                `User ${userId} (${userName}) joined group ${groupId}`
            )

            client.emit('joinGroupResponse', {
                success: true,
                groupId,
                message: 'Successfully joined group chat'
            })
        } catch (error) {
            this.logger.error('Error joining group:', error.message)
            client.emit('error', { message: 'Failed to join group' })
        }
    }

    @SubscribeMessage('leaveGroup')
    async handleLeaveGroup(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { groupId: string; userId: string }
    ) {
        try {
            const { groupId, userId } = data

            if (!groupId || !userId) {
                client.emit('error', {
                    message: 'Group ID and User ID are required'
                })
                return
            }

            // Leave the group room
            client.leave(`group:${groupId}`)

            this.logger.log(`User ${userId} left group ${groupId}`)

            client.emit('leaveGroupResponse', {
                success: true,
                groupId,
                message: 'Successfully left group chat'
            })
        } catch (error) {
            this.logger.error('Error leaving group:', error.message)
            client.emit('error', { message: 'Failed to leave group' })
        }
    }

    @SubscribeMessage('sendGroupMessage')
    async handleSendMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            group: string
            avatar?: string | null
            sender: {
                _id: string
                name: string
                role?: string | null
            }
            content: string
            createdAt?: string
            updatedAt?: string | null
            __v?: number | null
            type?: string | null
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
            const senderRole = sender.role || 'member'

            this.logger.log(
                `Processing message from ${senderId} (${senderName}) to group ${groupId}`
            )

            // Auto-join the group room if not already joined
            client.join(`group:${groupId}`)

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

            // Create response in the Flutter-expected format
            const response = {
                _id: message.id, // Flutter expects _id
                group: groupId,
                sender: {
                    _id: senderId, // Flutter expects _id
                    name: senderName,
                    role: senderRole
                },
                content: content,
                avatar: avatar || '',
                createdAt: message.timestamp.toISOString(), // Ensure ISO string format
                updatedAt: (
                    message.updatedAt || message.timestamp
                ).toISOString(),
                __v: 0,
                type: type || 'text',
                success: true
            }

            // Broadcast the message to all clients in the group room
            this.server
                .to(`group:${groupId}`)
                .emit('sendGroupMessageResponse', response)

            this.logger.log(
                `Group message sent by ${senderId} to group ${groupId} - Message ID: ${message.id}`
            )

            return response
        } catch (error) {
            this.logger.error('Error sending group message:', error.message)
            this.logger.error('Stack trace:', error.stack)

            const errorResponse = {
                error: 'Failed to send message',
                message: error.message,
                success: false
            }

            client.emit('sendGroupMessageResponse', errorResponse)
            return errorResponse
        }
    }

    @SubscribeMessage('getGroupMessageHistory')
    async getGroupMessageHistory(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            groupId: string
            userId: string
            page?: number
            limit?: number
            before?: string // messageId to get messages before this
        }
    ) {
        try {
            const { groupId, userId, page = 1, limit = 50, before } = data

            if (!userId || !groupId) {
                client.emit('error', {
                    message: 'Group ID and User ID are required'
                })
                return
            }

            // Verify group membership
            const isMember = await this.groupChatService.verifyGroupMembership(
                userId,
                groupId
            )
            if (!isMember) {
                client.emit('error', {
                    message: 'User is not a member of this group'
                })
                return
            }

            const messages = await this.groupChatService.getGroupMessageHistory(
                groupId,
                page,
                limit,
                before
            )

            // Format messages for Flutter compatibility with actual user roles
            const formattedMessages = await Promise.all(
                messages.map(async (message) => {
                    // Get user's actual role from database
                    const userRole = await this.groupChatService.getUserRole(
                        groupId,
                        message.senderId
                    )

                    const response = {
                        _id: message.id, // Flutter expects _id
                        group: groupId,
                        sender: {
                            _id: message.senderId, // Flutter expects _id
                            name: message.senderName,
                            role: userRole || 'member'
                        },
                        content: message.content,
                        avatar: message.senderAvatarUrl || '',
                        createdAt: message.timestamp.toISOString(), // Ensure ISO string format
                        updatedAt: (
                            message.updatedAt || message.timestamp
                        ).toISOString(),
                        __v: 0,
                        type: message.messageType || 'text',
                        success: true
                    }

                    return response
                })
            )

            client.emit('groupMessageHistory', {
                groupId,
                messages: formattedMessages,
                page,
                limit,
                hasMore: messages.length === limit
            })

            this.logger.log(
                `Message history sent for group ${groupId} to user ${userId}`
            )
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

            if (!userId || !groupId) {
                client.emit('error', {
                    message: 'Group ID and User ID are required'
                })
                return
            }

            // Verify group membership
            const isMember = await this.groupChatService.verifyGroupMembership(
                userId,
                groupId
            )
            if (!isMember) {
                client.emit('error', {
                    message: 'User is not a member of this group'
                })
                return
            }

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

            this.logger.log(
                `User ${userId} marked ${messageIds.length} messages as read in group ${groupId}`
            )
        } catch (error) {
            this.logger.error('Error marking messages as read:', error.message)
            client.emit('error', { message: 'Failed to mark messages as read' })
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

        if (!userId || !groupId) return

        // Verify group membership
        try {
            const isMember = await this.groupChatService.verifyGroupMembership(
                userId,
                groupId
            )
            if (!isMember) return

            client.to(`group:${groupId}`).emit('userTypingInGroup', {
                groupId,
                userId: userId,
                userName: userName,
                isTyping
            })

            this.logger.debug(
                `User ${userId} typing status: ${isTyping} in group ${groupId}`
            )
        } catch (error) {
            this.logger.error('Error handling typing status:', error.message)
        }
    }

    @SubscribeMessage('deleteGroupMessage')
    async handleDeleteMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: { groupId: string; messageId: string; userId: string }
    ) {
        try {
            const { groupId, messageId, userId } = data

            if (!userId || !groupId || !messageId) {
                client.emit('error', {
                    message: 'Group ID, Message ID, and User ID are required'
                })
                return
            }

            // Verify group membership
            const isMember = await this.groupChatService.verifyGroupMembership(
                userId,
                groupId
            )
            if (!isMember) {
                client.emit('error', {
                    message: 'User is not a member of this group'
                })
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
                this.logger.log(
                    `Message ${messageId} deleted by ${userId} in group ${groupId}`
                )
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

            if (!userId || !groupId || !messageId || !newContent) {
                client.emit('error', { message: 'All fields are required' })
                return
            }

            // Verify group membership
            const isMember = await this.groupChatService.verifyGroupMembership(
                userId,
                groupId
            )
            if (!isMember) {
                client.emit('error', {
                    message: 'User is not a member of this group'
                })
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
                this.logger.log(
                    `Message ${messageId} edited by ${userId} in group ${groupId}`
                )
            } else {
                client.emit('error', { message: 'Cannot edit this message' })
            }
        } catch (error) {
            this.logger.error('Error editing message:', error.message)
            client.emit('error', { message: 'Failed to edit message' })
        }
    }
}
