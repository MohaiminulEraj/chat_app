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
import { GroupChatService } from './group-chat.service'

interface AuthenticatedSocket extends Socket {
    userId?: string
    userUuid?: string
    userName?: string
    userAvatarUrl?: string
}

@WebSocketGateway({
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    namespace: 'group-chat',
    transports: ['websocket', 'polling'],
    path: '/socket.io/'
})
export class GroupChatGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server

    private logger = new Logger('GroupChatGateway')
    private userSockets = new Map<string, AuthenticatedSocket[]>() // userId -> sockets
    private groupMembers = new Map<string, Set<string>>() // groupId -> Set of userIds

    constructor(
        private readonly groupChatService: GroupChatService,
        private readonly jwtService: JwtService
    ) {}

    async handleConnection(client: AuthenticatedSocket) {
        this.logger.log(`Client connected: ${client.id}`)
    }

    async handleDisconnect(client: AuthenticatedSocket) {
        this.logger.log(`Client disconnected: ${client.id}`)

        if (client.userUuid) {
            // Remove from user sockets map
            const userSockets = this.userSockets.get(client.userUuid) || []
            const updatedSockets = userSockets.filter(
                (socket) => socket.id !== client.id
            )

            if (updatedSockets.length === 0) {
                this.userSockets.delete(client.userUuid)
                // Remove user from all groups they were in
                for (const [groupId, members] of this.groupMembers.entries()) {
                    if (members.has(client.userUuid)) {
                        members.delete(client.userUuid)
                        // Notify other group members that user went offline
                        this.server
                            .to(`group:${groupId}`)
                            .emit('userLeftGroup', {
                                userId: client.userUuid,
                                userName: client.userName,
                                groupId
                            })
                    }
                }
            } else {
                this.userSockets.set(client.userUuid, updatedSockets)
            }
        }
    }

    @SubscribeMessage('authenticate')
    async handleAuthenticate(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { token: string }
    ) {
        try {
            const payload = this.jwtService.verify(data.token)

            client.userId = payload.id?.toString()
            client.userUuid = payload.uuid
            client.userName = payload.name || payload.email
            client.userAvatarUrl = payload.avatarUrl || null

            // Add to user sockets map
            const userSockets = this.userSockets.get(client.userUuid) || []
            userSockets.push(client)
            this.userSockets.set(client.userUuid, userSockets)

            client.emit('authenticated', {
                success: true,
                userId: client.userUuid,
                userName: client.userName
            })

            this.logger.log(
                `User authenticated: ${client.userUuid} (${client.userName})`
            )
        } catch (error) {
            this.logger.error('Authentication failed:', error.message)
            client.emit('authenticationError', { message: 'Invalid token' })
            client.disconnect()
        }
    }

    @SubscribeMessage('joinGroup')
    async handleJoinGroup(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { groupId: string }
    ) {
        if (!client.userUuid) {
            client.emit('error', { message: 'User not authenticated' })
            return
        }

        try {
            const { groupId } = data

            // Verify user is a member of the group
            const isMember = await this.groupChatService.verifyGroupMembership(
                client.userUuid,
                groupId
            )

            if (!isMember) {
                client.emit('error', { message: 'Not a member of this group' })
                return
            }

            // Join the socket room
            await client.join(`group:${groupId}`)

            // Add to group members tracking
            if (!this.groupMembers.has(groupId)) {
                this.groupMembers.set(groupId, new Set())
            }
            this.groupMembers.get(groupId)!.add(client.userUuid)

            // Notify other group members
            client.to(`group:${groupId}`).emit('userJoinedGroup', {
                userId: client.userUuid,
                userName: client.userName,
                groupId
            })

            client.emit('joinedGroup', {
                groupId,
                message: 'Successfully joined group chat'
            })

            this.logger.log(`User ${client.userUuid} joined group ${groupId}`)
        } catch (error) {
            this.logger.error('Error joining group:', error.message)
            client.emit('error', { message: 'Failed to join group' })
        }
    }

    @SubscribeMessage('leaveGroup')
    async handleLeaveGroup(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { groupId: string }
    ) {
        if (!client.userUuid) return

        const { groupId } = data

        // Leave the socket room
        await client.leave(`group:${groupId}`)

        // Remove from group members tracking
        if (this.groupMembers.has(groupId)) {
            this.groupMembers.get(groupId)!.delete(client.userUuid)
        }

        // Notify other group members
        client.to(`group:${groupId}`).emit('userLeftGroup', {
            userId: client.userUuid,
            userName: client.userName,
            groupId
        })

        client.emit('leftGroup', { groupId })
        this.logger.log(`User ${client.userUuid} left group ${groupId}`)
    }

    @SubscribeMessage('sendGroupMessage')
    async handleSendMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            groupId: string
            content: string
            messageType: string
            metadata?: any
            replyToMessageId?: string
        }
    ) {
        if (!client.userUuid) {
            client.emit('error', { message: 'User not authenticated' })
            return
        }

        try {
            const {
                groupId,
                content,
                messageType,
                metadata,
                replyToMessageId
            } = data

            // Verify user is a member of the group
            const isMember = await this.groupChatService.verifyGroupMembership(
                client.userUuid,
                groupId
            )

            if (!isMember) {
                client.emit('error', { message: 'Not a member of this group' })
                return
            }

            // Save message to MongoDB
            const message = await this.groupChatService.saveGroupMessage({
                senderId: client.userUuid,
                senderName: client.userName!,
                senderAvatarUrl: client.userAvatarUrl || '',
                groupId,
                content,
                messageType: messageType || 'text',
                metadata: metadata || {},
                replyToMessageId
            })

            // Emit to all group members
            this.server.to(`group:${groupId}`).emit('groupMessageReceived', {
                messageId: message._id,
                senderId: client.userUuid,
                senderName: client.userName,
                senderAvatarUrl: client.userAvatarUrl,
                groupId,
                content,
                messageType,
                metadata,
                replyToMessage: message.replyToMessage,
                timestamp: message.timestamp,
                readBy: message.readBy,
                deliveredTo: message.deliveredTo
            })

            this.logger.log(
                `Message sent to group ${groupId} by ${client.userUuid}`
            )
        } catch (error) {
            this.logger.error('Error sending group message:', error.message)
            client.emit('error', { message: 'Failed to send message' })
        }
    }

    @SubscribeMessage('getGroupMessageHistory')
    async handleGetMessageHistory(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            groupId: string
            // page?: number
            // limit?: number
            // before?: string // messageId to get messages before this
        }
    ) {
        if (!client.userUuid) {
            client.emit('error', { message: 'User not authenticated' })
            return
        }

        try {
            const {
                groupId
                // page = 1,
                // limit = 50,
                // before
            } = data

            // Verify user is a member of the group
            const isMember = await this.groupChatService.verifyGroupMembership(
                client.userUuid,
                groupId
            )

            if (!isMember) {
                client.emit('error', { message: 'Not a member of this group' })
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
        @MessageBody() data: { groupId: string; messageIds: string[] }
    ) {
        if (!client.userUuid) return

        try {
            const { groupId, messageIds } = data

            await this.groupChatService.markMessagesAsRead(
                groupId,
                messageIds,
                client.userUuid
            )

            // Notify other group members about read status
            client.to(`group:${groupId}`).emit('messagesMarkedAsRead', {
                groupId,
                messageIds,
                readBy: client.userUuid,
                userName: client.userName
            })
        } catch (error) {
            this.logger.error('Error marking messages as read:', error.message)
        }
    }

    @SubscribeMessage('groupTyping')
    async handleTyping(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { groupId: string; isTyping: boolean }
    ) {
        if (!client.userUuid) return

        const { groupId, isTyping } = data

        client.to(`group:${groupId}`).emit('userTypingInGroup', {
            groupId,
            userId: client.userUuid,
            userName: client.userName,
            isTyping
        })
    }

    @SubscribeMessage('deleteGroupMessage')
    async handleDeleteMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { groupId: string; messageId: string }
    ) {
        if (!client.userUuid) return

        try {
            const { groupId, messageId } = data

            const success = await this.groupChatService.deleteMessage(
                groupId,
                messageId,
                client.userUuid
            )

            if (success) {
                this.server.to(`group:${groupId}`).emit('groupMessageDeleted', {
                    groupId,
                    messageId,
                    deletedBy: client.userUuid
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
        }
    ) {
        if (!client.userUuid) return

        try {
            const { groupId, messageId, newContent } = data

            const updatedMessage = await this.groupChatService.editMessage(
                groupId,
                messageId,
                newContent,
                client.userUuid
            )

            if (updatedMessage) {
                this.server.to(`group:${groupId}`).emit('groupMessageEdited', {
                    groupId,
                    messageId,
                    newContent,
                    editedBy: client.userUuid,
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

    @SubscribeMessage('getGroupMembers')
    async handleGetGroupMembers(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { groupId: string }
    ) {
        if (!client.userUuid) return

        try {
            const { groupId } = data

            const members = await this.groupChatService.getGroupMembers(groupId)
            const onlineMembers = this.groupMembers.get(groupId) || new Set()

            const membersWithStatus = members.map((member) => ({
                ...member,
                isOnline: onlineMembers.has(member.uuid)
            }))

            client.emit('groupMembersList', {
                groupId,
                members: membersWithStatus
            })
        } catch (error) {
            this.logger.error('Error getting group members:', error.message)
            client.emit('error', { message: 'Failed to get group members' })
        }
    }
}
