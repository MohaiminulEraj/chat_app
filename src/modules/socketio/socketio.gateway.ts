import { Injectable, Logger } from '@nestjs/common'
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
import { ConversationService } from '../conversation/conversation.service'
import { FriendshipService } from '../friendship/friendship.service'
import { GroupService } from '../group/group.service'
import { UserService } from '../user/user.service'
import { SocketIOService } from './socketio.service'

interface AuthenticatedSocket extends Socket {
    userId?: string
    userUuid?: string
    userName?: string
    userEmail?: string
    userAvatarUrl?: string
}

@Injectable()
@WebSocketGateway({
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
})
export class SocketIOGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server

    private logger = new Logger('SocketIOGateway')
    private authenticatedUsers = new Map<string, AuthenticatedSocket[]>() // userId -> sockets
    private socketUserMap = new Map<string, string>() // socketId -> userId

    constructor(
        private readonly jwtService: JwtService,
        private readonly conversationService: ConversationService,
        private readonly friendshipService: FriendshipService,
        private readonly groupService: GroupService,
        private readonly userService: UserService,
        private readonly socketIOService: SocketIOService
    ) {}

    async handleConnection(client: AuthenticatedSocket) {
        this.logger.log(`Client connected: ${client.id}`)
        
        client.emit('connected', {
            success: true,
            message: 'Connected to real-time server',
            socketId: client.id
        })
    }

    async handleDisconnect(client: AuthenticatedSocket) {
        this.logger.log(`Client disconnected: ${client.id}`)

        if (client.userUuid) {
            // Remove from authenticated users map
            const userSockets = this.authenticatedUsers.get(client.userUuid) || []
            const updatedSockets = userSockets.filter(socket => socket.id !== client.id)
            
            if (updatedSockets.length === 0) {
                this.authenticatedUsers.delete(client.userUuid)
                // Update user status to offline
                await this.updateUserStatus(client.userUuid, 'offline')
            } else {
                this.authenticatedUsers.set(client.userUuid, updatedSockets)
            }

            // Remove from socket user map
            this.socketUserMap.delete(client.id)

            // Leave all rooms
            client.rooms.forEach(room => {
                if (room !== client.id) {
                    client.leave(room)
                }
            })
        }
    }

    // ==================== AUTHENTICATION ====================
    @SubscribeMessage('authenticate')
    async handleAuthenticate(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { token: string }
    ) {
        try {
            this.logger.log(`Authenticating client: ${client.id}`)

            // Verify JWT token
            const payload = this.jwtService.verify(data.token)
            
            // Set user data on socket
            client.userId = payload.id?.toString()
            client.userUuid = payload.uuid
            client.userName = payload.name || payload.email
            client.userEmail = payload.email
            client.userAvatarUrl = payload.avatarUrl || null

            // Add to authenticated users map
            const userSockets = this.authenticatedUsers.get(client.userUuid) || []
            userSockets.push(client)
            this.authenticatedUsers.set(client.userUuid, userSockets)

            // Add to socket user map
            this.socketUserMap.set(client.id, client.userUuid)

            // Join user's personal room
            client.join(`user:${client.userUuid}`)

            // Join all user's conversation rooms
            await this.joinUserConversations(client)

            // Join all user's group rooms
            await this.joinUserGroups(client)

            // Update user status to online
            await this.updateUserStatus(client.userUuid, 'online')

            client.emit('authenticated', {
                success: true,
                userId: client.userUuid,
                userName: client.userName,
                message: 'Authentication successful'
            })

            this.logger.log(`User ${client.userUuid} (${client.userName}) authenticated successfully`)
            
            return { success: true, userId: client.userUuid }

        } catch (error) {
            this.logger.error(`Authentication failed: ${error.message}`)
            
            client.emit('authenticationError', { 
                success: false, 
                message: 'Invalid token' 
            })
            
            client.disconnect(true)
            return { success: false, error: error.message }
        }
    }

    // ==================== DIRECT MESSAGING ====================
    @SubscribeMessage('sendDirectMessage')
    async handleDirectMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: {
            recipientId: string
            type: 'text' | 'image' | 'file' | 'voice'
            content?: string
            fileUrl?: string
            metadata?: any
        }
    ) {
        if (!client.userUuid) {
            return { success: false, error: 'User not authenticated' }
        }

        try {
            // Get or create direct conversation
            const conversation = await this.conversationService.getOrCreateDirectConversation(
                client.userUuid,
                data.recipientId
            )

            // Create message
            const message = await this.conversationService.createMessage({
                conversationId: conversation.uuid,
                senderId: client.userUuid,
                type: data.type as any,
                content: data.content,
                fileUrl: data.fileUrl
            })

            // Emit to conversation participants
            this.server.to(`conversation:${conversation.uuid}`).emit('newDirectMessage', {
                conversationId: conversation.uuid,
                message,
                sender: {
                    uuid: client.userUuid,
                    name: client.userName,
                    avatarUrl: client.userAvatarUrl
                }
            })

            return { success: true, message, conversationId: conversation.uuid }

        } catch (error) {
            this.logger.error(`Error sending direct message: ${error.message}`)
            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('joinDirectConversation')
    async handleJoinDirectConversation(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { conversationId: string }
    ) {
        if (!client.userUuid) {
            return { success: false, error: 'User not authenticated' }
        }

        try {
            // Verify user is part of this conversation
            const conversation = await this.conversationService.getConversation(data.conversationId)
            
            if (!conversation.participantIds.includes(client.userUuid)) {
                return { success: false, error: 'Access denied' }
            }

            // Join conversation room
            client.join(`conversation:${data.conversationId}`)

            return { success: true, conversationId: data.conversationId }

        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('leaveDirectConversation')
    async handleLeaveDirectConversation(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { conversationId: string }
    ) {
        client.leave(`conversation:${data.conversationId}`)
        return { success: true, conversationId: data.conversationId }
    }

    // ==================== GROUP MESSAGING ====================
    @SubscribeMessage('sendGroupMessage')
    async handleGroupMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: {
            groupId: string
            type: 'text' | 'image' | 'file' | 'voice'
            content?: string
            fileUrl?: string
            metadata?: any
            replyToMessageId?: string
        }
    ) {
        if (!client.userUuid) {
            return { success: false, error: 'User not authenticated' }
        }

        try {
            // Verify user is a member of the group
            const isMember = await this.isUserGroupMember(client.userUuid, data.groupId)
            if (!isMember) {
                return { success: false, error: 'You are not a member of this group' }
            }

            // Create group message - for now using conversation service with group type
            const message = await this.conversationService.createMessage({
                conversationId: `group:${data.groupId}`,
                senderId: client.userUuid,
                type: data.type as any,
                content: data.content,
                fileUrl: data.fileUrl
            })

            // Emit to all group members
            this.server.to(`group:${data.groupId}`).emit('newGroupMessage', {
                groupId: data.groupId,
                message,
                sender: {
                    uuid: client.userUuid,
                    name: client.userName,
                    avatarUrl: client.userAvatarUrl
                }
            })

            return { success: true, message, groupId: data.groupId }

        } catch (error) {
            this.logger.error(`Error sending group message: ${error.message}`)
            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('joinGroup')
    async handleJoinGroup(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { groupId: string }
    ) {
        if (!client.userUuid) {
            return { success: false, error: 'User not authenticated' }
        }

        try {
            // Verify user is a member of the group
            const isMember = await this.isUserGroupMember(client.userUuid, data.groupId)
            if (!isMember) {
                return { success: false, error: 'You are not a member of this group' }
            }

            // Join group room
            client.join(`group:${data.groupId}`)

            // Notify other group members
            client.to(`group:${data.groupId}`).emit('userJoinedGroup', {
                groupId: data.groupId,
                user: {
                    uuid: client.userUuid,
                    name: client.userName,
                    avatarUrl: client.userAvatarUrl
                }
            })

            return { success: true, groupId: data.groupId }

        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('leaveGroup')
    async handleLeaveGroup(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { groupId: string }
    ) {
        client.leave(`group:${data.groupId}`)

        // Notify other group members
        client.to(`group:${data.groupId}`).emit('userLeftGroup', {
            groupId: data.groupId,
            user: {
                uuid: client.userUuid,
                name: client.userName,
                avatarUrl: client.userAvatarUrl
            }
        })

        return { success: true, groupId: data.groupId }
    }

    // ==================== TYPING INDICATORS ====================
    @SubscribeMessage('typing')
    async handleTyping(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: {
            conversationId?: string
            groupId?: string
            isTyping: boolean
        }
    ) {
        if (!client.userUuid) return

        const room = data.conversationId 
            ? `conversation:${data.conversationId}` 
            : `group:${data.groupId}`

        client.to(room).emit('userTyping', {
            userId: client.userUuid,
            userName: client.userName,
            conversationId: data.conversationId,
            groupId: data.groupId,
            isTyping: data.isTyping
        })

        return { success: true }
    }

    // ==================== MESSAGE STATUS ====================
    @SubscribeMessage('markAsRead')
    async handleMarkAsRead(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: {
            conversationId?: string
            groupId?: string
            messageIds: string[]
        }
    ) {
        if (!client.userUuid) return

        try {
            if (data.conversationId) {
                await this.conversationService.markMessagesAsRead(
                    data.conversationId,
                    data.messageIds,
                    client.userUuid
                )

                this.server.to(`conversation:${data.conversationId}`).emit('messagesRead', {
                    conversationId: data.conversationId,
                    messageIds: data.messageIds,
                    readBy: {
                        uuid: client.userUuid,
                        name: client.userName
                    }
                })
            } else if (data.groupId) {
                // Handle group message read status
                this.server.to(`group:${data.groupId}`).emit('groupMessagesRead', {
                    groupId: data.groupId,
                    messageIds: data.messageIds,
                    readBy: {
                        uuid: client.userUuid,
                        name: client.userName
                    }
                })
            }

            return { success: true }

        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // ==================== USER STATUS ====================
    @SubscribeMessage('updateStatus')
    async handleUpdateStatus(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { status: 'online' | 'away' | 'busy' | 'offline' }
    ) {
        if (!client.userUuid) return

        try {
            await this.updateUserStatus(client.userUuid, data.status)
            return { success: true, status: data.status }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // ==================== VOICE/VIDEO CALLS ====================
    @SubscribeMessage('initiateCall')
    async handleInitiateCall(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: {
            recipientId?: string
            groupId?: string
            callType: 'voice' | 'video'
            callId: string
        }
    ) {
        if (!client.userUuid) return

        const targetRoom = data.recipientId 
            ? `user:${data.recipientId}` 
            : `group:${data.groupId}`

        this.server.to(targetRoom).emit('incomingCall', {
            callId: data.callId,
            callType: data.callType,
            caller: {
                uuid: client.userUuid,
                name: client.userName,
                avatarUrl: client.userAvatarUrl
            },
            recipientId: data.recipientId,
            groupId: data.groupId
        })

        return { success: true, callId: data.callId }
    }

    @SubscribeMessage('respondToCall')
    async handleRespondToCall(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: {
            callId: string
            response: 'accept' | 'decline'
            callerId: string
        }
    ) {
        if (!client.userUuid) return

        this.server.to(`user:${data.callerId}`).emit('callResponse', {
            callId: data.callId,
            response: data.response,
            responder: {
                uuid: client.userUuid,
                name: client.userName,
                avatarUrl: client.userAvatarUrl
            }
        })

        return { success: true }
    }

    @SubscribeMessage('endCall')
    async handleEndCall(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: {
            callId: string
            participants: string[]
        }
    ) {
        if (!client.userUuid) return

        // Notify all participants
        data.participants.forEach(participantId => {
            this.server.to(`user:${participantId}`).emit('callEnded', {
                callId: data.callId,
                endedBy: {
                    uuid: client.userUuid,
                    name: client.userName
                }
            })
        })

        return { success: true }
    }

    // ==================== HELPER METHODS ====================
    private async isUserGroupMember(userId: string, groupId: string): Promise<boolean> {
        try {
            const members = await this.groupService.getGroupMembers(groupId)
            return members.some(member => member.userId === userId)
        } catch (error) {
            this.logger.error(`Error checking group membership: ${error.message}`)
            return false
        }
    }

    private async joinUserConversations(client: AuthenticatedSocket) {
        try {
            const conversations = await this.conversationService.getUserConversations(client.userUuid)
            conversations.forEach(conversation => {
                client.join(`conversation:${conversation.uuid}`)
            })
        } catch (error) {
            this.logger.error(`Error joining user conversations: ${error.message}`)
        }
    }

    private async joinUserGroups(client: AuthenticatedSocket) {
        try {
            const groups = await this.groupService.getUserGroups(client.userUuid)
            groups.forEach(group => {
                client.join(`group:${group.uuid}`)
            })
        } catch (error) {
            this.logger.error(`Error joining user groups: ${error.message}`)
        }
    }

    private async updateUserStatus(userId: string, status: string) {
        try {
            await this.userService.updateStatus(userId, status as any)
            
            // Notify all friends about status change
            const friends = await this.friendshipService.getFriends(userId)
            friends.forEach(friendship => {
                const friendUserId = friendship.user.uuid
                this.server.to(`user:${friendUserId}`).emit('userStatusChanged', {
                    userId,
                    status,
                    timestamp: new Date()
                })
            })
        } catch (error) {
            this.logger.error(`Error updating user status: ${error.message}`)
        }
    }

    // ==================== PUBLIC METHODS FOR OTHER SERVICES ====================
    public emitToUser(userId: string, event: string, data: any) {
        this.server.to(`user:${userId}`).emit(event, data)
    }

    public emitToGroup(groupId: string, event: string, data: any) {
        this.server.to(`group:${groupId}`).emit(event, data)
    }

    public emitToConversation(conversationId: string, event: string, data: any) {
        this.server.to(`conversation:${conversationId}`).emit(event, data)
    }

    public getUserSockets(userId: string): AuthenticatedSocket[] {
        return this.authenticatedUsers.get(userId) || []
    }

    public isUserOnline(userId: string): boolean {
        return this.authenticatedUsers.has(userId)
    }
}
