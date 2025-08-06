import { Logger, UseGuards } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
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
    cors: {
        origin: '*'
    }
})
@UseGuards(WsJwtGuard)
export class RoomGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    public server: Server

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

    // In-memory seat state tracking for real-time updates
    private roomSeats = new Map<
        string,
        Array<{
            index: number
            locked: boolean
            occupied: boolean
            occupantUserId: string | null
        }>
    >()

    // User activity tracking for better monitoring
    private userLastActivity = new Map<string, Date>()
    private userActionCounts = new Map<
        string,
        {
            joinRoom: number
            sendComment: number
            seatActions: number
            totalActions: number
        }
    >()

    constructor(
        private readonly roomService: RoomService,
        private readonly giftService: GiftService,
        private readonly jwtService: JwtService
    ) {}

    afterInit(server: Server) {
        this.logger.log('🚀 Room Gateway initialized successfully')
        this.logger.log(`📡 WebSocket namespace: / (root)`)
        this.logger.log(`🔄 CORS enabled for all origins`)
        this.logger.log(`📊 Real-time tracking initialized:`)
        this.logger.log(`   ├─ Connected users tracking: Ready`)
        this.logger.log(`   ├─ Room user counts tracking: Ready`)
        this.logger.log(`   └─ Room seats state tracking: Ready`)

        // Log periodic statistics every 30 seconds
        setInterval(() => {
            this.logSystemStatistics()
        }, 30000)
    }

    handleConnection(client: Socket) {
        try {
            // Get user info from JWT auth (set by WsJwtGuard)
            const user = client['user']
            let userId = user?.uuid || user?.id
            let userName = user?.name || user?.email || 'Unknown User'
            let avatarUrl = user?.avatarUrl || user?.avatar || null

            // If no user data from JWT, check URL for token (Flutter pattern)
            if (!userId && client.handshake.url) {
                const urlParts = client.handshake.url.split('/')
                const tokenFromUrl = urlParts[urlParts.length - 1]

                if (tokenFromUrl && tokenFromUrl.startsWith('eyJ')) {
                    this.logger.log(
                        `🔑 Found JWT token in URL: ${tokenFromUrl.substring(0, 20)}...`
                    )
                    // We'll authenticate properly in the setup event
                }
            }

            // Allow connection even without immediate JWT verification
            // Flutter will send setup event with user data
            this.connectedUsers.set(client.id, {
                userId: userId || 'pending',
                userName: userName || 'Pending User',
                avatarUrl: avatarUrl,
                rooms: new Set<string>()
            })

            this.logger.log(
                `🔌 User connecting: ${userName || 'Pending'} (${userId || 'pending'}) | Socket: ${client.id} | ` +
                    `Total connections: ${this.connectedUsers.size} | IP: ${client.handshake?.address || 'unknown'}`
            )

            // Send connection acknowledgment
            client.emit('connected', {
                success: true,
                message: 'Connected to real-time server',
                socketId: client.id,
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
                // Leave all rooms user was in and handle seat cleanup
                userInfo.rooms.forEach(async (roomId) => {
                    try {
                        // Remove user from room in database
                        await this.roomService.leaveRoom(
                            roomId,
                            userInfo.userId
                        )

                        // Update seat state in memory
                        await this.updateRoomSeatsState(roomId)

                        // Get updated seat information
                        const updatedSeats = this.roomSeats.get(roomId) || []

                        const currentCount =
                            this.roomUserCounts.get(roomId) || 0
                        const newCount = Math.max(0, currentCount - 1)
                        this.roomUserCounts.set(roomId, newCount)

                        // Notify room about user leaving and seat update
                        client.to(`room:${roomId}`).emit('userLeft', {
                            roomId,
                            userId: userInfo.userId,
                            userName: userInfo.userName
                        })

                        // Broadcast updated seat state
                        this.server.to(`room:${roomId}`).emit('seatUpdated', {
                            roomId,
                            seats: updatedSeats
                        })

                        this.logger.log(
                            `📤 User ${userInfo.userName} disconnected and left room ${roomId} | Room users: ${newCount}`
                        )
                    } catch (error) {
                        this.logger.error(
                            `❌ Error handling disconnect for room ${roomId}: ${error.message}`
                        )
                    }
                })

                this.connectedUsers.delete(client.id)

                // Clean up user activity tracking
                this.userLastActivity.delete(userInfo.userId)
                // Keep action counts for statistics but clean up old entries periodically

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

    @SubscribeMessage('setup')
    async handleSetup(
        @ConnectedSocket() client: Socket,
        @MessageBody() userId: string
    ) {
        this.logger.log(
            `🔧 SETUP event received: Socket ${client.id} | UserId: ${userId}`
        )

        try {
            // Update the connected user info with proper userId
            const userInfo = this.connectedUsers.get(client.id)
            if (userInfo && userInfo.userId === 'pending') {
                // Extract token from URL if available
                let token = null
                if (client.handshake.url) {
                    const urlParts = client.handshake.url.split('/')
                    const tokenFromUrl = urlParts[urlParts.length - 1]
                    if (tokenFromUrl && tokenFromUrl.startsWith('eyJ')) {
                        token = tokenFromUrl
                    }
                }

                // If we have a token, verify it and get user data
                if (token) {
                    try {
                        const payload = await this.jwtService.verifyAsync(token)

                        // Update user info with JWT data
                        userInfo.userId = payload.uuid || payload.id || userId
                        userInfo.userName =
                            payload.name || payload.email || 'Unknown User'
                        userInfo.avatarUrl =
                            payload.avatarUrl || payload.avatar || null

                        // Also set on client for other handlers
                        client['user'] = payload
                        client.data = client.data || {}
                        client.data.userId = userInfo.userId
                        client.data.userName = userInfo.userName
                        client.data.email = payload.email
                        client.data.avatarUrl = userInfo.avatarUrl

                        this.logger.log(
                            `✅ SETUP complete: User ${userInfo.userName} (${userInfo.userId}) authenticated via JWT`
                        )
                    } catch (jwtError) {
                        this.logger.warn(
                            `⚠️ JWT verification failed in setup: ${jwtError.message}`
                        )
                        // Fall back to using the provided userId
                        userInfo.userId = userId
                    }
                } else {
                    // No token, just use provided userId
                    userInfo.userId = userId
                    this.logger.log(
                        `⚠️ SETUP without JWT: User ${userId} connected without authentication`
                    )
                }

                this.connectedUsers.set(client.id, userInfo)
            }

            // Emit authenticated event to match Flutter expectations
            client.emit('authenticated', {
                status: 'success',
                userId: userInfo?.userId || userId,
                message: 'User authenticated successfully',
                timestamp: new Date().toISOString()
            })

            return {
                status: 'success',
                userId: userInfo?.userId || userId,
                message: 'Setup completed successfully'
            }
        } catch (error) {
            this.logger.error(
                `❌ SETUP failed for socket ${client.id}: ${error.message}`,
                error.stack
            )
            return {
                status: 'error',
                message: error.message
            }
        }
    }

    @SubscribeMessage('roomID')
    async handleRoomID(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomID: string; useId: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId || data.useId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `📥 ROOM_ID request: User ${userName} (${userId}) wants to join room ${data.roomID}`
        )

        try {
            if (!data.roomID) {
                throw new Error('Room ID is required')
            }

            // Update user info with provided userId if needed
            if (userInfo && userInfo.userId === 'pending') {
                userInfo.userId = data.useId
                this.connectedUsers.set(client.id, userInfo)
            }

            const participant = await this.roomService.joinRoom(
                data.roomID,
                userId,
                undefined, // password
                undefined // seatNumber
            )

            // Update tracking
            if (userInfo) {
                userInfo.rooms.add(data.roomID)
            }

            const currentCount = this.roomUserCounts.get(data.roomID) || 0
            const newCount = currentCount + 1
            this.roomUserCounts.set(data.roomID, newCount)

            // Join socket room
            client.join(`room:${data.roomID}`)

            // Update seat state in memory
            await this.updateRoomSeatsState(data.roomID)

            // Get updated seat information
            const updatedSeats = this.roomSeats.get(data.roomID) || []

            // Notify all room participants about user joining
            this.server.to(`room:${data.roomID}`).emit('userJoined', {
                roomId: data.roomID,
                participant,
                userName,
                seatIndex: participant.seatNumber - 1 // Convert to 0-based
            })

            // Broadcast updated seat state
            this.server.to(`room:${data.roomID}`).emit('seatUpdated', {
                roomId: data.roomID,
                seats: updatedSeats
            })

            this.logger.log(
                `✅ ROOM_ID success: User ${userName} (${userId}) joined room ${data.roomID} | ` +
                    `Seat: ${participant.seatNumber - 1} | Room users: ${newCount}`
            )

            // Track user activity
            this.trackUserActivity(userId, 'joinRoom')

            return {
                status: 'success',
                participant,
                seatIndex: participant.seatNumber - 1, // Convert to 0-based
                seats: updatedSeats,
                roomUserCount: newCount,
                message: `Successfully joined room ${data.roomID}`
            }
        } catch (error) {
            this.logger.error(
                `❌ ROOM_ID failed: User ${userName} (${userId}) failed to join room ${data.roomID} | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return {
                status: 'error',
                message: error.message,
                roomId: data.roomID
            }
        }
    }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: { roomId: string; seatNumber?: number; password?: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `📥 JOIN_ROOM request: User ${userName} (${userId}) wants to join room ${data.roomId}${
                data.seatNumber !== undefined ? ` seat ${data.seatNumber}` : ''
            }`
        )

        try {
            if (!data.roomId) {
                throw new Error('Room ID is required')
            }

            const participant = await this.roomService.joinRoom(
                data.roomId,
                userId,
                data.password,
                data.seatNumber
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

            // Update seat state in memory
            await this.updateRoomSeatsState(data.roomId)

            // Get updated seat information
            const updatedSeats = this.roomSeats.get(data.roomId) || []

            // Notify all room participants about user joining
            this.server.to(`room:${data.roomId}`).emit('userJoined', {
                roomId: data.roomId,
                participant,
                userName,
                seatIndex: participant.seatNumber - 1 // Convert to 0-based
            })

            // Broadcast updated seat state
            this.server.to(`room:${data.roomId}`).emit('seatUpdated', {
                roomId: data.roomId,
                seats: updatedSeats
            })

            this.logger.log(
                `✅ JOIN_ROOM success: User ${userName} (${userId}) joined room ${data.roomId} | ` +
                    `Seat: ${participant.seatNumber - 1} | Room users: ${newCount}`
            )

            // Track user activity
            this.trackUserActivity(userId, 'joinRoom')

            return {
                status: 'success',
                participant,
                seatIndex: participant.seatNumber - 1, // Convert to 0-based
                seats: updatedSeats,
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

            // Update seat state in memory
            await this.updateRoomSeatsState(roomId)

            // Get updated seat information
            const updatedSeats = this.roomSeats.get(roomId) || []

            // Notify all room participants about user leaving
            this.server.to(`room:${roomId}`).emit('userLeft', {
                roomId,
                userId,
                userName
            })

            // Broadcast updated seat state
            this.server.to(`room:${roomId}`).emit('seatUpdated', {
                roomId,
                seats: updatedSeats,
                action: 'user_left',
                userId
            })

            this.logger.log(
                `✅ LEAVE_ROOM success: User ${userName} (${userId}) left room ${roomId} | ` +
                    `Room users: ${newCount}`
            )

            return {
                status: 'success',
                seats: updatedSeats,
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

            // Track user activity
            this.trackUserActivity(userId, 'sendComment')

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
        @MessageBody()
        data: {
            roomId: string
            userInfo: {
                userId: string
                name: string
                avatar: string | null
                seatIndex: number
                isSpeaking: boolean
                micOn: boolean
                role: string
            }
        }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `🔇 TOGGLE_MUTE received: Client ${client.id} | User ${userName} (${userId}) | Data: ${JSON.stringify(data)}`
        )

        // Validate required data
        if (!data || !data.roomId || !data.userInfo) {
            const errorMsg =
                'Invalid toggleMute data: missing roomId or userInfo'
            this.logger.error(
                `❌ ${errorMsg} | Received: ${JSON.stringify(data)}`
            )
            return {
                status: 'error',
                message: errorMsg,
                receivedData: data
            }
        }

        // Determine mute status from micOn: if micOn is false, user is being muted
        const isMuted = !data.userInfo.micOn
        // micOn will be the updated status passed in the request
        const micOn = data.userInfo.micOn

        this.logger.log(
            `🔇 TOGGLE_MUTE: User ${userName} (${userId}) ${isMuted ? 'muting' : 'unmuting'} seat ${data.userInfo.seatIndex} in room ${data.roomId} | micOn will be: ${micOn}`
        )

        try {
            // Update participant status by seat index
            const { userId: targetUserId, userName: targetUserName } =
                await this.roomService.updateParticipantStatusBySeat(
                    data.roomId,
                    data.userInfo.seatIndex,
                    {
                        isMuted: isMuted
                    }
                )

            // Get updated room details to fetch participant information
            const roomDetails = await this.roomService.getRoomDetails(
                data.roomId
            )

            // Find the updated user info from room details
            let updatedUserInfo = null

            // Check if the target user is the host
            if (targetUserId === roomDetails.hostId) {
                updatedUserInfo = {
                    userId: roomDetails.hostId,
                    name: roomDetails.hostName,
                    avatar: roomDetails.hostImage,
                    seatIndex: data.userInfo.seatIndex,
                    isSpeaking: false, // Default value
                    micOn: micOn, // Set based on action: mute=false, unmute=true
                    role: 'host'
                }
            } else {
                // Find the user in participants
                const participant = roomDetails.participants.find(
                    (p) => p.userId === targetUserId
                )
                if (participant) {
                    updatedUserInfo = {
                        userId: participant.userId,
                        name: participant.name,
                        avatar: participant.avatar,
                        seatIndex: participant.seatIndex,
                        isSpeaking: participant.isSpeaking,
                        micOn: micOn, // Set based on action: mute=false, unmute=true
                        role: participant.role
                    }
                }
            }

            // Track user activity
            this.trackUserActivity(userId, 'seatActions')

            // Emit the updated user info to all room participants in the expected format
            this.server.to(`room:${data.roomId}`).emit('toggleMute', {
                roomId: data.roomId,
                userInfo: updatedUserInfo
            })

            this.logger.log(
                `✅ TOGGLE_MUTE success: User ${userName} (${userId}) ${isMuted ? 'muted' : 'unmuted'} seat ${data.userInfo.seatIndex} (${targetUserName}) in room ${data.roomId}`
            )

            // Return response in the requested format
            const response = {
                status: 'success',
                roomId: data.roomId,
                userInfo: updatedUserInfo,
                message: `Successfully ${isMuted ? 'muted' : 'unmuted'} seat ${data.userInfo.seatIndex}`
            }

            return response
        } catch (error) {
            this.logger.error(
                `❌ TOGGLE_MUTE failed: User ${userName} (${userId}) failed to toggle mute for seat ${data.userInfo.seatIndex} in room ${data.roomId} | ` +
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

    @SubscribeMessage('kickUser')
    async handleKickUser(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId: string
            participantID?: string
            seatIndex?: number
            action?: string
        }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `👢 KICK_USER: User ${userName} (${userId}) attempting to kick user | Data: ${JSON.stringify(data)}`
        )

        try {
            let kickedUserId: string
            let kickedUserName: string

            // Handle Flutter pattern: {roomId, participantID}
            if (data.participantID) {
                this.logger.log(
                    `👢 KICK_USER (Flutter pattern): Kicking participant ${data.participantID} from room ${data.roomId}`
                )

                // Leave room for the kicked user
                await this.roomService.leaveRoom(
                    data.roomId,
                    data.participantID
                )

                kickedUserId = data.participantID
                kickedUserName = 'Kicked User' // We'll get the actual name from connected users if available

                // Try to get the actual user name from connected users
                const kickedUserInfo = Array.from(
                    this.connectedUsers.values()
                ).find((user) => user.userId === data.participantID)
                if (kickedUserInfo) {
                    kickedUserName = kickedUserInfo.userName
                }
            }
            // Handle legacy pattern: {roomId, seatIndex, action}
            else if (data.seatIndex !== undefined) {
                this.logger.log(
                    `👢 KICK_USER (Legacy pattern): Kicking user from seat ${data.seatIndex} in room ${data.roomId}`
                )

                // Kick the user from the specified seat
                const result = await this.roomService.kickUserFromSeat(
                    data.roomId,
                    data.seatIndex,
                    userId
                )

                kickedUserId = result.userId
                kickedUserName = result.userName
            } else {
                throw new Error(
                    'Invalid kick data: missing participantID or seatIndex'
                )
            }

            // Track user activity
            this.trackUserActivity(userId, 'seatActions')

            // Find the kicked user's socket to disconnect them from the room
            const kickedUserSocket = Array.from(
                this.connectedUsers.entries()
            ).find(([socketId, user]) => user.userId === kickedUserId)

            if (kickedUserSocket) {
                const [kickedSocketId] = kickedUserSocket
                const kickedSocket =
                    this.server.sockets.sockets.get(kickedSocketId)
                if (kickedSocket) {
                    // Remove from socket room
                    kickedSocket.leave(`room:${data.roomId}`)

                    // Update user's room tracking
                    const kickedUserInfo =
                        this.connectedUsers.get(kickedSocketId)
                    if (kickedUserInfo) {
                        kickedUserInfo.rooms.delete(data.roomId)
                    }
                }
            }

            // Update room user count
            const currentCount = this.roomUserCounts.get(data.roomId) || 0
            const newCount = Math.max(0, currentCount - 1)
            this.roomUserCounts.set(data.roomId, newCount)

            // Notify the kicked user specifically
            this.server.to(`user:${kickedUserId}`).emit('userKicked', {
                roomId: data.roomId,
                participantID: kickedUserId,
                seatIndex: data.seatIndex,
                reason: 'Kicked by room moderator',
                kickedBy: {
                    userId: userId,
                    userName: userName
                }
            })

            // Notify all room participants about the kick
            this.server.to(`room:${data.roomId}`).emit('participantKicked', {
                roomId: data.roomId,
                participantID: kickedUserId,
                seatIndex: data.seatIndex,
                kickedUserId: kickedUserId,
                kickedUserName: kickedUserName,
                kickedBy: {
                    userId: userId,
                    userName: userName
                },
                timestamp: new Date().toISOString()
            })

            // Update room seats state
            await this.updateRoomSeatsState(data.roomId)

            // Emit updated room state
            const updatedSeats = await this.roomService.getRoomSeats(
                data.roomId
            )
            this.server.to(`room:${data.roomId}`).emit('roomSeatsUpdate', {
                roomId: data.roomId,
                seats: updatedSeats
            })

            this.logger.log(
                `✅ KICK_USER success: User ${userName} (${userId}) kicked ${kickedUserName} (${kickedUserId}) from room ${data.roomId} | Room users: ${newCount}`
            )

            return {
                status: 'success',
                participantID: kickedUserId,
                seatIndex: data.seatIndex,
                kickedUserId: kickedUserId,
                kickedUserName: kickedUserName,
                roomUserCount: newCount,
                message: `Successfully kicked ${kickedUserName}`
            }
        } catch (error) {
            this.logger.error(
                `❌ KICK_USER failed: User ${userName} (${userId}) failed to kick user | Data: ${JSON.stringify(data)} | ` +
                    `Error: ${error.message}`,
                error.stack
            )
            return {
                status: 'error',
                message: error.message,
                participantID: data.participantID,
                seatIndex: data.seatIndex,
                roomId: data.roomId
            }
        }
    }

    // Handle the typo version that Flutter is sending
    @SubscribeMessage('kikUser')
    async handleKikUser(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId: string
            participantID?: string
            seatIndex?: number
            action?: string
        }
    ) {
        this.logger.log(
            `👢 KIK_USER (typo handler): Redirecting to kickUser handler | Data: ${JSON.stringify(data)}`
        )

        // Redirect to the correct handler
        return this.handleKickUser(client, data)
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

    @SubscribeMessage('getSystemStats')
    async handleGetSystemStats(@ConnectedSocket() client: Socket) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `📊 GET_SYSTEM_STATS: User ${userName} (${userId}) requested system statistics`
        )

        try {
            const totalConnections = this.connectedUsers.size
            const activeRooms = this.roomUserCounts.size
            const totalRoomUsers = Array.from(
                this.roomUserCounts.values()
            ).reduce((sum, count) => sum + count, 0)
            const totalSeatsTracked = Array.from(
                this.roomSeats.values()
            ).reduce((sum, seats) => sum + seats.length, 0)

            // Get unique users across all rooms
            const uniqueUsers = new Set<string>()
            this.connectedUsers.forEach((user) => uniqueUsers.add(user.userId))

            // Get user activity for this user
            const userActivity = this.userActionCounts.get(userId)
            const lastActivity = this.userLastActivity.get(userId)

            return {
                status: 'success',
                systemStats: {
                    totalConnections,
                    uniqueUsers: uniqueUsers.size,
                    activeRooms,
                    totalRoomUsers,
                    totalSeatsTracked,
                    serverUptime: process.uptime
                        ? Math.floor(process.uptime())
                        : null
                },
                userActivity: userActivity
                    ? {
                          ...userActivity,
                          lastActivity: lastActivity?.toISOString()
                      }
                    : null
            }
        } catch (error) {
            this.logger.error(
                `❌ GET_SYSTEM_STATS failed: User ${userName} (${userId}) failed to get system stats | ` +
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

    // ==================== SEAT MANAGEMENT ====================

    @SubscribeMessage('requestSeat')
    async handleRequestSeat(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; seatIndex?: number }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `🪑 REQUEST_SEAT: User ${userName} (${userId}) requesting seat${
                data.seatIndex !== undefined ? ` ${data.seatIndex}` : ' (auto)'
            } in room ${data.roomId}`
        )

        try {
            // This will be handled through joinRoom with seat parameter
            return await this.handleJoinRoom(client, {
                roomId: data.roomId,
                seatNumber: data.seatIndex
            })
        } catch (error) {
            this.logger.error(
                `❌ REQUEST_SEAT failed: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('toggleSeatLock')
    async handleToggleSeatLock(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: { roomId: string; seatIndex: number; isLocked: boolean }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `🔒 TOGGLE_SEAT_LOCK: User ${userName} (${userId}) ${
                data.isLocked ? 'locking' : 'unlocking'
            } seat ${data.seatIndex} in room ${data.roomId}`
        )

        try {
            if (!data.roomId || data.seatIndex === undefined) {
                throw new Error('Room ID and seat index are required')
            }

            const result = await this.roomService.toggleSeatLock(
                data.roomId,
                data.seatIndex,
                data.isLocked,
                userId
            )

            // Update seat state in memory
            await this.updateRoomSeatsState(data.roomId)

            // Get updated seat information
            const updatedSeats = this.roomSeats.get(data.roomId) || []

            // Broadcast updated seat state to all room participants
            this.server.to(`room:${data.roomId}`).emit('seatUpdated', {
                roomId: data.roomId,
                seats: updatedSeats,
                action: 'lock_toggle',
                seatIndex: data.seatIndex,
                isLocked: data.isLocked,
                lockedBy: userId
            })

            this.logger.log(
                `✅ TOGGLE_SEAT_LOCK success: Seat ${data.seatIndex} ${
                    data.isLocked ? 'locked' : 'unlocked'
                } in room ${data.roomId}`
            )

            // Track user activity
            this.trackUserActivity(userId, 'seatActions')

            return {
                status: 'success',
                result,
                seats: updatedSeats,
                message: `Seat ${data.seatIndex} ${
                    data.isLocked ? 'locked' : 'unlocked'
                } successfully`
            }
        } catch (error) {
            this.logger.error(
                `❌ TOGGLE_SEAT_LOCK failed: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('getRoomSeats')
    async handleGetRoomSeats(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `🪑 GET_ROOM_SEATS: User ${userName} (${userId}) requesting seats for room ${data.roomId}`
        )

        try {
            if (!data.roomId) {
                throw new Error('Room ID is required')
            }

            // Update seat state in memory
            await this.updateRoomSeatsState(data.roomId)

            // Get current seat information
            const seats = this.roomSeats.get(data.roomId) || []

            this.logger.log(
                `✅ GET_ROOM_SEATS success: Returned ${seats.length} seats for room ${data.roomId}`
            )

            return {
                status: 'success',
                seats,
                roomId: data.roomId,
                message: 'Room seats retrieved successfully'
            }
        } catch (error) {
            this.logger.error(
                `❌ GET_ROOM_SEATS failed: ${error.message}`,
                error.stack
            )
            return { status: 'error', message: error.message }
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Update room seats state in memory from database
     */
    private async updateRoomSeatsState(roomId: string): Promise<void> {
        try {
            const seats = await this.roomService.getRoomSeats(roomId)
            this.roomSeats.set(roomId, seats)
        } catch (error) {
            this.logger.error(
                `❌ Failed to update seat state for room ${roomId}: ${error.message}`
            )
        }
    }

    /**
     * Track user activity for monitoring
     */
    private trackUserActivity(
        userId: string,
        action: 'joinRoom' | 'sendComment' | 'seatActions'
    ): void {
        // Update last activity timestamp
        this.userLastActivity.set(userId, new Date())

        // Update action counts
        const currentCounts = this.userActionCounts.get(userId) || {
            joinRoom: 0,
            sendComment: 0,
            seatActions: 0,
            totalActions: 0
        }

        currentCounts[action]++
        currentCounts.totalActions++
        this.userActionCounts.set(userId, currentCounts)
    }

    /**
     * Log periodic system statistics for monitoring
     */
    private logSystemStatistics(): void {
        const totalConnections = this.connectedUsers.size
        const activeRooms = this.roomUserCounts.size
        const totalRoomUsers = Array.from(this.roomUserCounts.values()).reduce(
            (sum, count) => sum + count,
            0
        )
        const totalSeatsTracked = Array.from(this.roomSeats.values()).reduce(
            (sum, seats) => sum + seats.length,
            0
        )

        // Get unique users across all rooms
        const uniqueUsers = new Set<string>()
        this.connectedUsers.forEach((user) => uniqueUsers.add(user.userId))

        // Get room activity breakdown
        const roomActivity = Array.from(this.roomUserCounts.entries())
            .filter(([roomId, count]) => count > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5) // Top 5 most active rooms

        // Get most active users
        const activeUsers = Array.from(this.userActionCounts.entries())
            .sort(([, a], [, b]) => b.totalActions - a.totalActions)
            .slice(0, 3) // Top 3 most active users

        this.logger.log(
            `📊 SYSTEM STATISTICS:\n` +
                `   ├─ 🔌 Total WebSocket connections: ${totalConnections}\n` +
                `   ├─ 👥 Unique users connected: ${uniqueUsers.size}\n` +
                `   ├─ 🏠 Active rooms: ${activeRooms}\n` +
                `   ├─ 👤 Total room participants: ${totalRoomUsers}\n` +
                `   ├─ 🪑 Total seats tracked: ${totalSeatsTracked}\n` +
                `   ├─ 🔥 Top active rooms: ${
                    roomActivity.length > 0
                        ? roomActivity
                              .map(([roomId, count]) => `${roomId}(${count})`)
                              .join(', ')
                        : 'None'
                }\n` +
                `   └─ ⭐ Most active users: ${
                    activeUsers.length > 0
                        ? activeUsers
                              .map(
                                  ([userId, counts]) =>
                                      `${userId}(${counts.totalActions})`
                              )
                              .join(', ')
                        : 'None'
                }`
        )

        // Log memory usage if available
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const memory = process.memoryUsage()
            this.logger.debug(
                `💾 Memory usage: RSS: ${Math.round(memory.rss / 1024 / 1024)}MB | ` +
                    `Heap Used: ${Math.round(memory.heapUsed / 1024 / 1024)}MB | ` +
                    `Heap Total: ${Math.round(memory.heapTotal / 1024 / 1024)}MB`
            )
        }
    }

    @SubscribeMessage('leave_room')
    async handleLeaveRoomEvent(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `🚪 LEAVE_ROOM event: User ${userName} (${userId}) wants to leave room ${data.roomId}`
        )

        try {
            await this.roomService.leaveRoom(data.roomId, userId)

            // Update tracking
            if (userInfo) {
                userInfo.rooms.delete(data.roomId)
            }

            const currentCount = this.roomUserCounts.get(data.roomId) || 0
            const newCount = Math.max(0, currentCount - 1)
            this.roomUserCounts.set(data.roomId, newCount)

            // Leave socket room
            client.leave(`room:${data.roomId}`)

            // Update seat state in memory
            await this.updateRoomSeatsState(data.roomId)

            // Get updated seat information
            const updatedSeats = this.roomSeats.get(data.roomId) || []

            // Notify all room participants about user leaving
            this.server.to(`room:${data.roomId}`).emit('userLeft', {
                roomId: data.roomId,
                userId,
                userName
            })

            // Broadcast updated seat state
            this.server.to(`room:${data.roomId}`).emit('seatUpdated', {
                roomId: data.roomId,
                seats: updatedSeats,
                action: 'user_left',
                userId
            })

            this.logger.log(
                `✅ LEAVE_ROOM event success: User ${userName} (${userId}) left room ${data.roomId} | ` +
                    `Room users: ${newCount}`
            )

            return {
                status: 'success',
                seats: updatedSeats,
                roomUserCount: newCount,
                message: `Successfully left room ${data.roomId}`
            }
        } catch (error) {
            this.logger.error(
                `❌ LEAVE_ROOM event failed: User ${userName} (${userId}) failed to leave room ${data.roomId} | ` +
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
}
