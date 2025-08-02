import { Logger, UseGuards } from '@nestjs/common'
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard'
import { GiftService } from '../gift/gift.service'
import { CreateRoomCommentDto } from './dto/room-comment.dto'
import { RoomService } from './room.service'

@WebSocketGateway({
    namespace: 'rooms',
    cors: {
        origin: '*'
    }
})
@UseGuards(WsJwtGuard)
export class RoomGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server

    private readonly logger = new Logger(RoomGateway.name)
    private connectedUsers = new Map<
        string,
        {
            userId: string
            userName?: string
            avatarUrl?: string
            rooms: Set<string>
        }
    >()
    private roomUserCounts = new Map<string, number>()

    constructor(
        private readonly roomService: RoomService,
        private readonly giftService: GiftService
    ) {}

    afterInit(server: Server) {
        this.logger.log('🚀 Room Gateway initialized successfully')
        this.logger.log(`📡 WebSocket namespace: /rooms`)
        this.logger.log(`🔄 CORS enabled for all origins`)
    }

    handleConnection(client: Socket) {
        try {
            const userId = client.data?.userId
            const userName =
                client.data?.userName || client.data?.email || 'Unknown User'
            const avatarUrl = client.data?.avatarUrl || null

            if (!userId) {
                this.logger.warn(
                    `❌ Connection rejected - No userId found for socket ${client.id}`
                )
                client.disconnect()
                return
            }

            // Store connection info
            this.connectedUsers.set(client.id, {
                userId,
                userName,
                avatarUrl,
                rooms: new Set<string>()
            })

            this.logger.log(
                `🔌 User connected: ${userName} (${userId}) | Socket: ${client.id} | ` +
                    `Total connections: ${this.connectedUsers.size}`
            )

            // Send connection acknowledgment
            client.emit('connected', {
                status: 'success',
                message: 'Connected to rooms namespace',
                timestamp: new Date().toISOString()
            })
        } catch (error) {
            this.logger.error(
                `❌ Connection error for socket ${client.id}: ${error.message}`,
                error.stack
            )
            client.disconnect()
        }
    }

    handleDisconnect(client: Socket) {
        try {
            const userInfo = this.connectedUsers.get(client.id)

            if (userInfo) {
                // Leave all rooms user was in
                userInfo.rooms.forEach((roomId) => {
                    const currentCount = this.roomUserCounts.get(roomId) || 0
                    const newCount = Math.max(0, currentCount - 1)
                    this.roomUserCounts.set(roomId, newCount)

                    // Notify room about user leaving
                    client.to(`room:${roomId}`).emit('userLeft', {
                        roomId,
                        userId: userInfo.userId,
                        userName: userInfo.userName
                    })

                    this.logger.log(
                        `📤 User ${userInfo.userName} left room ${roomId} | Room users: ${newCount}`
                    )
                })

                this.connectedUsers.delete(client.id)

                this.logger.log(
                    `🔌 User disconnected: ${userInfo.userName} (${userInfo.userId}) | ` +
                        `Socket: ${client.id} | Total connections: ${this.connectedUsers.size}`
                )
            } else {
                this.logger.warn(`⚠️ Unknown socket disconnected: ${client.id}`)
            }
        } catch (error) {
            this.logger.error(
                `❌ Disconnect error for socket ${client.id}: ${error.message}`,
                error.stack
            )
        }
    }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `📥 JOIN_ROOM request: User ${userName} (${userId}) wants to join room ${data.roomId}`
        )

        try {
            if (!data.roomId) {
                throw new Error('Room ID is required')
            }

            const participant = await this.roomService.joinRoom(
                data.roomId,
                userId
            )

            // Update tracking
            if (userInfo) {
                userInfo.rooms.add(data.roomId)
            }

            const currentCount = this.roomUserCounts.get(data.roomId) || 0
            const newCount = currentCount + 1
            this.roomUserCounts.set(data.roomId, newCount)

            // Join socket room
            client.join(`room:${data.roomId}`)

            // Notify all room participants
            this.server.to(`room:${data.roomId}`).emit('userJoined', {
                roomId: data.roomId,
                participant,
                userName
            })

            this.logger.log(
                `✅ JOIN_ROOM success: User ${userName} (${userId}) joined room ${data.roomId} | ` +
                    `Seat: ${participant.seatNumber} | Room users: ${newCount}`
            )

            return {
                status: 'success',
                participant,
                roomUserCount: newCount,
                message: `Successfully joined room ${data.roomId}`
            }
        } catch (error) {
            this.logger.error(
                `❌ JOIN_ROOM failed: User ${userName} (${userId}) failed to join room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return {
                status: 'error',
                message: error.message,
                roomId: data.roomId
            }
        }
    }

    @SubscribeMessage('leaveRoom')
    async handleLeaveRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() roomId: string
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `📤 LEAVE_ROOM request: User ${userName} (${userId}) wants to leave room ${roomId}`
        )

        try {
            await this.roomService.leaveRoom(roomId, userId)

            // Update tracking
            if (userInfo) {
                userInfo.rooms.delete(roomId)
            }

            const currentCount = this.roomUserCounts.get(roomId) || 0
            const newCount = Math.max(0, currentCount - 1)
            this.roomUserCounts.set(roomId, newCount)

            // Leave socket room
            client.leave(`room:${roomId}`)

            // Notify all room participants
            this.server.to(`room:${roomId}`).emit('userLeft', {
                roomId,
                userId,
                userName
            })

            this.logger.log(
                `✅ LEAVE_ROOM success: User ${userName} (${userId}) left room ${roomId} | ` +
                    `Room users: ${newCount}`
            )

            return {
                status: 'success',
                roomUserCount: newCount,
                message: `Successfully left room ${roomId}`
            }
        } catch (error) {
            this.logger.error(
                `❌ LEAVE_ROOM failed: User ${userName} (${userId}) failed to leave room ${roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return {
                status: 'error',
                message: error.message,
                roomId
            }
        }
    }

    @SubscribeMessage('sendComment')
    async handleSendComment(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: CreateRoomCommentDto & { roomId: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `💬 SEND_COMMENT request: User ${userName} (${userId}) sending comment to room ${data.roomId} | ` +
                `Type: ${data.messageType || 'text'} | Length: ${data.message?.length || 0} chars` +
                (data.replyToId ? ` | Reply to: ${data.replyToId}` : '')
        )

        try {
            // Verify user is actually in the room (socket room membership)
            const roomName = `room:${data.roomId}`
            const isInSocketRoom = client.rooms.has(roomName)

            if (!isInSocketRoom) {
                throw new Error(
                    'You must join the room first before commenting'
                )
            }

            // Verify participant status in database
            const participants = await this.roomService.getRoomParticipants(
                data.roomId
            )
            const isParticipant = participants.some((p) => p.userId === userId)

            if (!isParticipant) {
                throw new Error('You are not a participant in this room')
            }

            const comment = await this.roomService.addRoomComment(
                data.roomId,
                userId,
                data.message,
                data.messageType || 'text',
                data.replyToId,
                data.metadata
            )

            // Create enhanced comment structure for real-time broadcast
            const realtimeComment = {
                _id: comment.uuid,
                senderId: userId,
                senderName: userName,
                senderImage: userInfo.avatarUrl || null,
                content: data.message,
                messageType: data.messageType || 'text',
                replyToId: data.replyToId || null,
                metadata: data.metadata || null,
                createdAt: comment.createdAt || new Date(),
                isVisible: true
            }

            // Emit to all room participants (including sender)
            this.server.to(roomName).emit('ReceivedComment', {
                content: data.message,
                senderId: userId,
                senderName: userName,
                senderImage: userInfo.avatarUrl || null,
                createdAt: comment.createdAt || new Date().toISOString(),
                roomId: data.roomId,
                commentId: comment.uuid,
                messageType: data.messageType || 'text',
                replyToId: data.replyToId || null,
                metadata: data.metadata || null
            })

            this.logger.log(
                `✅ SEND_COMMENT success: User ${userName} (${userId}) sent comment ${comment.uuid} to room ${data.roomId}`
            )

            return {
                status: 'success',
                comment: realtimeComment,
                roomId: data.roomId,
                commentId: comment.uuid
            }
        } catch (error) {
            this.logger.error(
                `❌ SEND_COMMENT failed: User ${userName} (${userId}) failed to send comment to room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return {
                status: 'error',
                message: error.message,
                roomId: data.roomId
            }
        }
    }

    @SubscribeMessage('deleteComment')
    async handleDeleteComment(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { commentId: string; roomId: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `🗑️ DELETE_COMMENT request: User ${userName} (${userId}) wants to delete comment ${data.commentId} from room ${data.roomId}`
        )

        try {
            // Verify user is in the room
            const roomName = `room:${data.roomId}`
            const isInSocketRoom = client.rooms.has(roomName)

            if (!isInSocketRoom) {
                throw new Error('You must be in the room to delete comments')
            }

            await this.roomService.deleteRoomComment(data.commentId, userId)

            // Notify all room participants
            this.server.to(roomName).emit('commentDeleted', {
                roomId: data.roomId,
                commentId: data.commentId,
                deletedBy: userId,
                deletedByName: userName,
                timestamp: new Date().toISOString()
            })

            this.logger.log(
                `✅ DELETE_COMMENT success: User ${userName} (${userId}) deleted comment ${data.commentId} from room ${data.roomId}`
            )

            return {
                status: 'success',
                commentId: data.commentId,
                roomId: data.roomId,
                message: 'Comment deleted successfully'
            }
        } catch (error) {
            this.logger.error(
                `❌ DELETE_COMMENT failed: User ${userName} (${userId}) failed to delete comment ${data.commentId} from room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return {
                status: 'error',
                message: error.message,
                commentId: data.commentId,
                roomId: data.roomId
            }
        }
    }

    @SubscribeMessage('sendGiftInRoom')
    async handleSendGiftInRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId: string
            receiverId: string
            giftId: string
            message?: string
        }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `🎁 SEND_GIFT: User ${userName} (${userId}) sending gift ${data.giftId} to ${data.receiverId} in room ${data.roomId}`
        )

        try {
            const transaction = await this.giftService.sendGift(
                userId,
                data.receiverId,
                data.giftId,
                data.roomId,
                data.message
            )

            // Emit to sender
            client.emit('giftSent', {
                success: true,
                transaction,
                roomId: data.roomId
            })

            // Emit to receiver
            this.server.to(`user:${data.receiverId}`).emit('giftReceived', {
                transaction,
                roomId: data.roomId
            })

            // Emit to all room participants
            this.server.to(`room:${data.roomId}`).emit('roomGiftSent', {
                roomId: data.roomId,
                transaction,
                sender: { id: userId, name: userName },
                receiver: { id: data.receiverId }
            })

            this.logger.log(
                `✅ SEND_GIFT success: User ${userName} (${userId}) sent gift ${data.giftId} to ${data.receiverId} in room ${data.roomId} | ` +
                    `Transaction: ${transaction.uuid}`
            )

            return { status: 'success', transaction }
        } catch (error) {
            this.logger.error(
                `❌ SEND_GIFT failed: User ${userName} (${userId}) failed to send gift ${data.giftId} to ${data.receiverId} in room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('getRoomComments')
    async handleGetRoomComments(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId: string
            limit?: number
            offset?: number
            lastCommentId?: string
        }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `📄 GET_ROOM_COMMENTS: User ${userName} (${userId}) requesting comments for room ${data.roomId} | ` +
                `Limit: ${data.limit || 'default'} | Offset: ${data.offset || 0}` +
                (data.lastCommentId
                    ? ` | LastCommentId: ${data.lastCommentId}`
                    : '')
        )

        try {
            // Verify user is in the room
            const roomName = `room:${data.roomId}`
            const isInSocketRoom = client.rooms.has(roomName)

            if (!isInSocketRoom) {
                this.logger.warn(
                    `⚠️ GET_ROOM_COMMENTS denied: User ${userName} (${userId}) is not in socket room ${data.roomId}`
                )
                throw new Error('You must join the room first to view comments')
            }

            // Verify user is a participant in the database
            const participants = await this.roomService.getRoomParticipants(
                data.roomId
            )
            const isParticipant = participants.some((p) => p.userId === userId)

            if (!isParticipant) {
                this.logger.warn(
                    `⚠️ GET_ROOM_COMMENTS denied: User ${userName} (${userId}) is not a participant in room ${data.roomId}`
                )
                throw new Error('You must be a participant to view comments')
            }

            const result = await this.roomService.getRoomComments(data.roomId)

            // Apply pagination if requested
            let paginatedComments = result
            if (data.limit || data.offset) {
                const limit = data.limit || 50
                const offset = data.offset || 0
                paginatedComments = result.slice(offset, offset + limit)
            }

            this.logger.log(
                `✅ GET_ROOM_COMMENTS success: User ${userName} (${userId}) retrieved ${paginatedComments.length}/${result.length} comments for room ${data.roomId}`
            )

            return {
                status: 'success',
                data: paginatedComments,
                count: paginatedComments.length,
                totalCount: result.length,
                hasMore: data.limit
                    ? (data.offset || 0) + (data.limit || 50) < result.length
                    : false,
                roomId: data.roomId
            }
        } catch (error) {
            this.logger.error(
                `❌ GET_ROOM_COMMENTS failed: User ${userName} (${userId}) failed to get comments for room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return {
                status: 'error',
                message: error.message,
                roomId: data.roomId
            }
        }
    }

    @SubscribeMessage('toggleMute')
    async handleToggleMute(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; isMuted: boolean }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `🔇 TOGGLE_MUTE: User ${userName} (${userId}) ${data.isMuted ? 'muted' : 'unmuted'} in room ${data.roomId}`
        )

        try {
            await this.roomService.updateParticipantStatus(
                data.roomId,
                userId,
                {
                    isMuted: data.isMuted
                }
            )

            this.server
                .to(`room:${data.roomId}`)
                .emit('participantStatusUpdate', {
                    roomId: data.roomId,
                    userId,
                    userName,
                    status: { isMuted: data.isMuted }
                })

            return {
                status: 'success',
                isMuted: data.isMuted,
                message: `Successfully ${data.isMuted ? 'muted' : 'unmuted'}`
            }
        } catch (error) {
            this.logger.error(
                `❌ TOGGLE_MUTE failed: User ${userName} (${userId}) failed to toggle mute in room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('toggleDeafen')
    async handleToggleDeafen(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; isDeafened: boolean }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `🔇 TOGGLE_DEAFEN: User ${userName} (${userId}) ${data.isDeafened ? 'deafened' : 'undeafened'} in room ${data.roomId}`
        )

        try {
            await this.roomService.updateParticipantStatus(
                data.roomId,
                userId,
                {
                    isDeafened: data.isDeafened
                }
            )

            this.server
                .to(`room:${data.roomId}`)
                .emit('participantStatusUpdate', {
                    roomId: data.roomId,
                    userId,
                    userName,
                    status: { isDeafened: data.isDeafened }
                })

            return {
                status: 'success',
                isDeafened: data.isDeafened,
                message: `Successfully ${data.isDeafened ? 'deafened' : 'undeafened'}`
            }
        } catch (error) {
            this.logger.error(
                `❌ TOGGLE_DEAFEN failed: User ${userName} (${userId}) failed to toggle deafen in room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('toggleVideo')
    async handleToggleVideo(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; isVideoOn: boolean }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `📹 TOGGLE_VIDEO: User ${userName} (${userId}) turned video ${data.isVideoOn ? 'on' : 'off'} in room ${data.roomId}`
        )

        try {
            await this.roomService.updateParticipantStatus(
                data.roomId,
                userId,
                {
                    isVideoOn: data.isVideoOn
                }
            )

            this.server
                .to(`room:${data.roomId}`)
                .emit('participantStatusUpdate', {
                    roomId: data.roomId,
                    userId,
                    userName,
                    status: { isVideoOn: data.isVideoOn }
                })

            return {
                status: 'success',
                isVideoOn: data.isVideoOn,
                message: `Video turned ${data.isVideoOn ? 'on' : 'off'} successfully`
            }
        } catch (error) {
            this.logger.error(
                `❌ TOGGLE_VIDEO failed: User ${userName} (${userId}) failed to toggle video in room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('updateSpeaking')
    async handleUpdateSpeaking(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; isSpeaking: boolean }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        // Use debug level for speaking status to avoid log spam
        this.logger.debug(
            `🗣️ UPDATE_SPEAKING: User ${userName} (${userId}) ${data.isSpeaking ? 'started' : 'stopped'} speaking in room ${data.roomId}`
        )

        try {
            await this.roomService.updateParticipantStatus(
                data.roomId,
                userId,
                {
                    isSpeaking: data.isSpeaking
                }
            )

            // Note: using client.to instead of server.to to avoid echoing back to sender
            client.to(`room:${data.roomId}`).emit('participantStatusUpdate', {
                roomId: data.roomId,
                userId,
                userName,
                status: { isSpeaking: data.isSpeaking }
            })

            return {
                status: 'success',
                isSpeaking: data.isSpeaking
            }
        } catch (error) {
            this.logger.error(
                `❌ UPDATE_SPEAKING failed: User ${userName} (${userId}) failed to update speaking status in room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    // Add a utility method to get room statistics
    @SubscribeMessage('getRoomStats')
    async handleGetRoomStats(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `📊 GET_ROOM_STATS: User ${userName} (${userId}) requested stats for room ${data.roomId}`
        )

        try {
            const roomUserCount = this.roomUserCounts.get(data.roomId) || 0
            const participants = await this.roomService.getRoomParticipants(
                data.roomId
            )

            return {
                status: 'success',
                stats: {
                    roomId: data.roomId,
                    connectedUsers: roomUserCount,
                    totalParticipants: participants.length,
                    participants: participants.map((p) => ({
                        userId: p.userId,
                        seatNumber: p.seatNumber,
                        isMuted: p.isMuted,
                        isDeafened: p.isDeafened,
                        isVideoOn: p.isVideoOn,
                        isSpeaking: p.isSpeaking
                    }))
                }
            }
        } catch (error) {
            this.logger.error(
                `❌ GET_ROOM_STATS failed: User ${userName} (${userId}) failed to get stats for room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    // Add comment reaction functionality
    @SubscribeMessage('reactToComment')
    async handleReactToComment(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId: string
            commentId: string
            reaction: string
            action: 'add' | 'remove'
        }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `👍 REACT_TO_COMMENT: User ${userName} (${userId}) ${data.action}ing reaction ${data.reaction} to comment ${data.commentId} in room ${data.roomId}`
        )

        try {
            // Verify user is in the room
            const roomName = `room:${data.roomId}`
            const isInSocketRoom = client.rooms.has(roomName)

            if (!isInSocketRoom) {
                throw new Error('You must be in the room to react to comments')
            }

            // Verify user is a room participant
            const isParticipant = await this.roomService.isUserInRoom(
                userId,
                data.roomId
            )
            if (!isParticipant) {
                throw new Error('You are not a participant in this room')
            }

            // Handle the reaction in the database
            const result = await this.roomService.handleCommentReaction(
                data.roomId,
                data.commentId,
                userId,
                data.reaction,
                data.action
            )

            if (!result.success) {
                throw new Error(result.error || 'Failed to handle reaction')
            }

            // Broadcast reaction update to all room participants
            this.server.to(roomName).emit('commentReaction', {
                roomId: data.roomId,
                commentId: data.commentId,
                reaction: data.reaction,
                action: data.action,
                userId: userId,
                userName: userName,
                reactions: result.comment?.reactions || {},
                timestamp: new Date().toISOString()
            })

            this.logger.log(
                `✅ REACT_TO_COMMENT success: User ${userName} (${userId}) ${data.action}ed reaction ${data.reaction}`
            )

            return {
                status: 'success',
                commentId: data.commentId,
                reaction: data.reaction,
                action: data.action,
                reactions: result.comment?.reactions || {}
            }
        } catch (error) {
            this.logger.error(
                `❌ REACT_TO_COMMENT failed: User ${userName} (${userId}) failed to react to comment | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    // Add typing indicator for comments
    @SubscribeMessage('typingComment')
    async handleTypingComment(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; isTyping: boolean }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        // Use debug level to avoid spam
        this.logger.debug(
            `⌨️ TYPING_COMMENT: User ${userName} (${userId}) ${data.isTyping ? 'started' : 'stopped'} typing in room ${data.roomId}`
        )

        try {
            const roomName = `room:${data.roomId}`
            const isInSocketRoom = client.rooms.has(roomName)

            if (!isInSocketRoom) {
                throw new Error(
                    'You must be in the room to send typing indicators'
                )
            }

            // Broadcast to all room participants except sender
            client.to(roomName).emit('userTypingComment', {
                roomId: data.roomId,
                userId: userId,
                userName: userName,
                isTyping: data.isTyping,
                timestamp: new Date().toISOString()
            })

            return { status: 'success', isTyping: data.isTyping }
        } catch (error) {
            this.logger.error(
                `❌ TYPING_COMMENT failed: User ${userName} (${userId}) failed to send typing indicator | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    // ==================== CALL MANAGEMENT ====================

    @SubscribeMessage('requestToJoinCall')
    async handleRequestToJoinCall(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; message?: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `📞 REQUEST_TO_JOIN_CALL: User ${userName} (${userId}) requesting to join call in room ${data.roomId}`
        )

        try {
            const roomName = `room:${data.roomId}`
            const isInSocketRoom = client.rooms.has(roomName)

            if (!isInSocketRoom) {
                throw new Error(
                    'You must be in the room to request call access'
                )
            }

            // Verify user is a participant
            const isParticipant = await this.roomService.isUserInRoom(
                userId,
                data.roomId
            )
            if (!isParticipant) {
                throw new Error('You are not a participant in this room')
            }

            // Emit request to all room participants (especially moderators)
            this.server.to(roomName).emit('UserRequestedToJoinCall', {
                userId: userId,
                roomId: data.roomId,
                name: userName,
                image: userInfo.avatarUrl || null,
                message: data.message || `${userName} wants to join the call`,
                timestamp: new Date().toISOString()
            })

            this.logger.log(
                `✅ REQUEST_TO_JOIN_CALL: Request broadcast for user ${userName} in room ${data.roomId}`
            )

            return {
                status: 'success',
                message: 'Call join request sent',
                roomId: data.roomId
            }
        } catch (error) {
            this.logger.error(
                `❌ REQUEST_TO_JOIN_CALL failed: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('grantMikeAccess')
    async handleGrantMikeAccess(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: { roomId: string; memberId: string; message?: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `🎤 GRANT_MIKE_ACCESS: User ${userName} (${userId}) granting mike access to ${data.memberId} in room ${data.roomId}`
        )

        try {
            const roomName = `room:${data.roomId}`

            // TODO: Add permission check - only moderators/owners should be able to grant access

            // Emit to the specific user and all room participants
            this.server.to(roomName).emit('MikeAccessGranted', {
                memberId: data.memberId,
                roomId: data.roomId,
                grantedBy: userId,
                grantedByName: userName,
                message:
                    data.message || 'You have been granted microphone access',
                timestamp: new Date().toISOString()
            })

            this.logger.log(
                `✅ GRANT_MIKE_ACCESS: Access granted to ${data.memberId} in room ${data.roomId}`
            )

            return {
                status: 'success',
                message: 'Microphone access granted',
                memberId: data.memberId,
                roomId: data.roomId
            }
        } catch (error) {
            this.logger.error(
                `❌ GRANT_MIKE_ACCESS failed: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('revokeMikeAccess')
    async handleRevokeMikeAccess(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: { roomId: string; memberId: string; message?: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `🎤 REVOKE_MIKE_ACCESS: User ${userName} (${userId}) revoking mike access from ${data.memberId} in room ${data.roomId}`
        )

        try {
            const roomName = `room:${data.roomId}`

            // TODO: Add permission check - only moderators/owners should be able to revoke access

            // Emit to the specific user and all room participants
            this.server.to(roomName).emit('MikeAccessRevoked', {
                memberId: data.memberId,
                roomId: data.roomId,
                revokedBy: userId,
                revokedByName: userName,
                message:
                    data.message || 'Your microphone access has been revoked',
                timestamp: new Date().toISOString()
            })

            this.logger.log(
                `✅ REVOKE_MIKE_ACCESS: Access revoked from ${data.memberId} in room ${data.roomId}`
            )

            return {
                status: 'success',
                message: 'Microphone access revoked',
                memberId: data.memberId,
                roomId: data.roomId
            }
        } catch (error) {
            this.logger.error(
                `❌ REVOKE_MIKE_ACCESS failed: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('closeRoomCall')
    async handleCloseRoomCall(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; reason?: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `📞 CLOSE_ROOM_CALL: User ${userName} (${userId}) closing call in room ${data.roomId}`
        )

        try {
            const roomName = `room:${data.roomId}`

            // TODO: Add permission check - only moderators/owners should be able to close calls

            // Emit to all room participants
            this.server.to(roomName).emit('RoomCallClosed', {
                roomId: data.roomId,
                closedBy: userId,
                closedByName: userName,
                reason: data.reason || 'Call ended by moderator',
                timestamp: new Date().toISOString()
            })

            this.logger.log(
                `✅ CLOSE_ROOM_CALL: Call closed in room ${data.roomId}`
            )

            return {
                status: 'success',
                message: 'Room call closed',
                roomId: data.roomId
            }
        } catch (error) {
            this.logger.error(
                `❌ CLOSE_ROOM_CALL failed: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('leave_room')
    async handleLeaveRoomLegacy(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string }
    ) {
        // Legacy support for Flutter client's leave_room event
        this.logger.log(
            `📤 LEAVE_ROOM (legacy): Redirecting to leaveRoom handler`
        )
        return this.handleLeaveRoom(client, data.roomId)
    }
}
