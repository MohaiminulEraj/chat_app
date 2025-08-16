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
        @MessageBody() data: { groupId: string; userId?: string }
    ) {
        try {
            const { groupId, userId } = data

            // Use provided userId or fall back to authenticated user
            const userIdToUse = userId || client.userUuid

            if (!userIdToUse) {
                client.emit('error', { message: 'User ID is required' })
                return
            }

            // Join the socket room
            await client.join(`group:${groupId}`)

            // Add to group members tracking
            if (!this.groupMembers.has(groupId)) {
                this.groupMembers.set(groupId, new Set())
            }
            this.groupMembers.get(groupId)!.add(userIdToUse)

            // Store user info on client for later use
            client.userUuid = userIdToUse

            client.emit('joinedGroup', {
                groupId,
                message: 'Successfully joined group chat'
            })

            this.logger.log(`User ${userIdToUse} joined group ${groupId}`)
        } catch (error) {
            this.logger.error('Error joining group:', error.message)
            client.emit('error', { message: 'Failed to join group' })
        }
    }

    @SubscribeMessage('leaveGroup')
    async handleLeaveGroup(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { groupId: string; userId?: string }
    ) {
        const { groupId, userId } = data
        const userIdToUse = userId || client.userUuid

        if (!userIdToUse) return

        // Leave the socket room
        await client.leave(`group:${groupId}`)

        // Remove from group members tracking
        if (this.groupMembers.has(groupId)) {
            this.groupMembers.get(groupId)!.delete(userIdToUse)
        }

        client.emit('leftGroup', { groupId })
        this.logger.log(`User ${userIdToUse} left group ${groupId}`)
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

            // Verify user is member of the group
            const isMember = await this.groupChatService.verifyGroupMembership(
                senderId,
                groupId
            )

            if (!isMember) {
                client.emit('sendGroupMessageResponse', {
                    error: 'You are not a member of this group',
                    success: false
                })
                return
            }

            // Save message to MongoDB
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
            const messageObj = message.toObject()
            const response = {
                _id: messageObj._id,
                group: groupId,
                sender: {
                    _id: senderId,
                    name: senderName,
                    role: senderRole
                },
                content: content,
                avatar: avatar || '',
                createdAt: messageObj.timestamp || messageObj.createdAt,
                updatedAt: messageObj.updatedAt || messageObj.timestamp,
                __v: messageObj.__v || 0,
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
                `Group message sent by ${senderId} (${senderRole}) to group ${groupId} - Message ID: ${messageObj._id}`
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
    async handleGetMessageHistory(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            groupId: string
            userId?: string
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

            const userIdToUse = userId || client.userUuid

            if (!userIdToUse) {
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
            userId?: string
            userName?: string
        }
    ) {
        try {
            const { groupId, messageIds, userId, userName } = data
            const userIdToUse = userId || client.userUuid
            const userNameToUse = userName || client.userName

            if (!userIdToUse) return

            await this.groupChatService.markMessagesAsRead(
                groupId,
                messageIds,
                userIdToUse
            )

            // Notify other group members about read status
            client.to(`group:${groupId}`).emit('messagesMarkedAsRead', {
                groupId,
                messageIds,
                readBy: userIdToUse,
                userName: userNameToUse
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
            userId?: string
            userName?: string
        }
    ) {
        const { groupId, isTyping, userId, userName } = data
        const userIdToUse = userId || client.userUuid
        const userNameToUse = userName || client.userName

        if (!userIdToUse) return

        client.to(`group:${groupId}`).emit('userTypingInGroup', {
            groupId,
            userId: userIdToUse,
            userName: userNameToUse,
            isTyping
        })
    }

    @SubscribeMessage('deleteGroupMessage')
    async handleDeleteMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: { groupId: string; messageId: string; userId?: string }
    ) {
        try {
            const { groupId, messageId, userId } = data
            const userIdToUse = userId || client.userUuid

            if (!userIdToUse) {
                client.emit('error', { message: 'User ID is required' })
                return
            }

            const success = await this.groupChatService.deleteMessage(
                groupId,
                messageId,
                userIdToUse
            )

            if (success) {
                this.server.to(`group:${groupId}`).emit('groupMessageDeleted', {
                    groupId,
                    messageId,
                    deletedBy: userIdToUse
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
            userId?: string
        }
    ) {
        try {
            const { groupId, messageId, newContent, userId } = data
            const userIdToUse = userId || client.userUuid

            if (!userIdToUse) {
                client.emit('error', { message: 'User ID is required' })
                return
            }

            const updatedMessage = await this.groupChatService.editMessage(
                groupId,
                messageId,
                newContent,
                userIdToUse
            )

            if (updatedMessage) {
                this.server.to(`group:${groupId}`).emit('groupMessageEdited', {
                    groupId,
                    messageId,
                    newContent,
                    editedBy: userIdToUse,
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
        @MessageBody() data: { groupId: string; userId?: string }
    ) {
        try {
            const { groupId, userId } = data
            const userIdToUse = userId || client.userUuid

            if (!userIdToUse) {
                client.emit('error', { message: 'User ID is required' })
                return
            }

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
