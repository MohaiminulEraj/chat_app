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
        this.server = server
        this.logger.log('🚀 Room Gateway initialized successfully')
        this.logger.log(`📡 WebSocket namespace: / (root)`)
        this.logger.log(`🔄 CORS enabled for all origins`)
        this.logger.log(`📊 Real-time tracking initialized:`)
        this.logger.log(`   ├─ Connected users tracking: Ready`)
        this.logger.log(`   ├─ Room user counts tracking: Ready`)
        this.logger.log(`   └─ Room seats state tracking: Ready`)

        // Set up global socket monitoring
        this.setupGlobalConnectionMonitoring()

        // Set up connection health monitoring
        this.setupConnectionHealthMonitoring()
    }

    private setupGlobalConnectionMonitoring() {
        if (this.server) {
            // Monitor all connections
            this.server.on('connection', (socket: Socket) => {
                this.logger.log(
                    `🔌 [GLOBAL] New connection detected: ${socket.id}`
                )

                // Set up socket-specific error handling
                socket.on('error', (error) => {
                    this.logger.error(
                        `❌ [SOCKET] Socket error on ${socket.id}: ${error.message}`
                    )
                })

                socket.on('disconnect', (reason) => {
                    this.logger.log(
                        `🔌 [GLOBAL] Socket ${socket.id} disconnected: ${reason}`
                    )
                })
            })

            // Monitor connection errors
            this.server.on('connect_error', (error) => {
                this.logger.error(
                    `❌ [SERVER] Connection error: ${error.message}`
                )
            })
        }
    }

    private setupConnectionHealthMonitoring() {
        // Set up periodic connection health checks
        setInterval(() => {
            if (this.server) {
                const connectedCount = this.server.sockets.sockets.size
                const trackedCount = this.connectedUsers.size

                this.logger.log(
                    `💓 [HEALTH] Connections - Server: ${connectedCount}, Tracked: ${trackedCount}`
                )

                // Clean up orphaned connections
                if (connectedCount !== trackedCount) {
                    this.cleanupOrphanedConnections()
                }
            }
        }, 30000) // Check every 30 seconds

        // Set up periodic statistics logging
        setInterval(() => {
            this.logSystemStatistics()
        }, 60000) // Log stats every minute
    }

    private cleanupOrphanedConnections() {
        const serverSocketIds = new Set(
            Array.from(this.server.sockets.sockets.keys())
        )

        for (const [socketId] of this.connectedUsers) {
            if (!serverSocketIds.has(socketId)) {
                this.logger.log(
                    `🧹 [CLEANUP] Removing orphaned connection: ${socketId}`
                )
                this.connectedUsers.delete(socketId)
            }
        }
    }

    handleConnection(client: Socket) {
        const connectionTime = new Date().toISOString()
        const clientIp = client.handshake.address
        const userAgent = client.handshake.headers['user-agent']
        const transport = client.conn.transport.name

        this.logger.log(`🔌 [CONNECTION] New client connected to Room Gateway`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(`   ├─ IP Address: ${clientIp}`)
        this.logger.log(`   ├─ User Agent: ${userAgent || 'Unknown'}`)
        this.logger.log(`   ├─ Transport: ${transport}`)
        this.logger.log(`   ├─ Connection Time: ${connectionTime}`)
        this.logger.log(
            `   └─ Total Active Connections: ${this.connectedUsers.size + 1}`
        )

        try {
            // Get user info from JWT auth (set by WsJwtGuard)
            const user = client['user']
            let userId = user?.uuid || user?.id
            let userName = user?.name || user?.email || 'Unknown User'
            let avatarUrl = user?.avatarUrl || user?.avatar || null

            // Try to authenticate from token if available
            const token =
                client.handshake.auth?.token ||
                client.handshake.query?.token ||
                (client.handshake.url &&
                    this.extractTokenFromUrl(client.handshake.url))

            if (token && !userId) {
                this.logger.log(
                    `🔑 Found JWT token, attempting authentication...`
                )
                // We'll handle proper JWT verification in setup event
                // For now, just log that we found a token
                this.logger.log(`   ├─ Token Length: ${token.length} chars`)
                this.logger.log(
                    `   └─ Token Preview: ${token.substring(0, 20)}...`
                )
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
                `✅ Connection established: ${userName || 'Pending'} (${userId || 'pending'}) | Socket: ${client.id}`
            )

            // Send connection acknowledgment immediately
            client.emit('connected', {
                success: true,
                message: 'Connected to Room Gateway',
                socketId: client.id,
                timestamp: connectionTime,
                authenticated: !!userId
            })

            // Also emit connection status update
            client.emit('connectionStatusUpdate', {
                status: 'connected',
                socketId: client.id,
                timestamp: connectionTime,
                gateway: 'room'
            })

            // Set up connection health monitoring
            this.setupConnectionHealthCheck(client)
        } catch (error) {
            this.logger.error(
                `❌ Connection error for socket ${client.id}: ${error.message}`,
                error.stack
            )
            // Don't disconnect immediately, let the client try to authenticate
            client.emit('connectionError', {
                error: 'Connection initialization failed',
                message: error.message,
                timestamp: connectionTime
            })
        }
    }

    /**
     * Extract JWT token from URL path
     */
    private extractTokenFromUrl(url: string): string | null {
        try {
            const urlParts = url.split('/')
            const tokenCandidate = urlParts[urlParts.length - 1]

            // Check if it looks like a JWT token (starts with eyJ)
            if (tokenCandidate && tokenCandidate.startsWith('eyJ')) {
                return tokenCandidate
            }
            return null
        } catch (error) {
            this.logger.warn(
                `Failed to extract token from URL: ${error.message}`
            )
            return null
        }
    }

    /**
     * Set up connection health monitoring
     */
    private setupConnectionHealthCheck(client: Socket): void {
        // Set up ping/pong for connection health
        const pingInterval = setInterval(() => {
            if (client.connected) {
                client.emit('ping', { timestamp: Date.now() })
            } else {
                clearInterval(pingInterval)
            }
        }, 30000) // Ping every 30 seconds

        // Handle pong responses
        client.on('pong', (data) => {
            const latency = Date.now() - data.timestamp
            this.logger.debug(
                `🏓 Pong received from ${client.id}, latency: ${latency}ms`
            )
        })

        // Clean up interval on disconnect
        client.on('disconnect', () => {
            clearInterval(pingInterval)
        })
    }

    handleDisconnect(client: Socket) {
        try {
            const userInfo = this.connectedUsers.get(client.id)

            if (userInfo) {
                this.logger.log(
                    `🔌 User ${userInfo.userName} (${userInfo.userId}) disconnecting from rooms: [${Array.from(userInfo.rooms).join(', ')}]`
                )

                // Leave all rooms user was in and handle seat cleanup for each specific room
                userInfo.rooms.forEach(async (roomId) => {
                    try {
                        this.logger.log(
                            `🚪 Processing disconnect for user ${userInfo.userName} from room ${roomId}`
                        )

                        // Remove user from this specific room in database
                        await this.roomService.leaveRoom(
                            roomId,
                            userInfo.userId
                        )

                        // Update seat state in memory for this specific room
                        await this.updateRoomSeatsState(roomId)

                        // Get updated seat information for this specific room
                        const updatedSeats = this.roomSeats.get(roomId) || []

                        const currentCount =
                            this.roomUserCounts.get(roomId) || 0
                        const newCount = Math.max(0, currentCount - 1)
                        this.roomUserCounts.set(roomId, newCount)

                        // Notify this specific room about user leaving and seat update
                        client.to(`room:${roomId}`).emit('userLeft', {
                            roomId,
                            userId: userInfo.userId,
                            userName: userInfo.userName
                        })

                        // Broadcast updated seat state to this specific room
                        this.server.to(`room:${roomId}`).emit('seatUpdated', {
                            roomId,
                            seats: updatedSeats
                        })

                        // Emit disconnect activity update
                        this.server
                            .to(`room:${roomId}`)
                            .emit('disconnectActivityUpdate', {
                                action: 'user_disconnected',
                                roomId: roomId,
                                userId: userInfo.userId,
                                userName: userInfo.userName,
                                roomUserCount: newCount,
                                timestamp: new Date().toISOString()
                            })

                        // Emit room leave confirmation
                        this.server
                            .to(`room:${roomId}`)
                            .emit('roomLeaveUpdate', {
                                action: 'user_disconnected',
                                roomId: roomId,
                                userId: userInfo.userId,
                                userName: userInfo.userName,
                                roomUserCount: newCount,
                                timestamp: new Date().toISOString()
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
        @MessageBody() data: any
    ) {
        const setupStartTime = Date.now()
        const userId = typeof data === 'string' ? data : data?.userId

        this.logger.log(
            `🔧 [SETUP] Setup event received: Socket ${client.id} | UserId: ${userId}`
        )

        try {
            // Update the connected user info with proper userId
            const userInfo = this.connectedUsers.get(client.id)
            if (!userInfo) {
                throw new Error('User info not found for socket')
            }

            let authenticatedUser = null

            // Try multiple authentication methods
            const token =
                client.handshake.auth?.token ||
                client.handshake.query?.token ||
                this.extractTokenFromUrl(client.handshake.url) ||
                data?.token

            if (token) {
                try {
                    this.logger.log(`🔐 [SETUP] Attempting JWT verification...`)
                    const payload = await this.jwtService.verifyAsync(token)

                    authenticatedUser = {
                        userId: payload.uuid || payload.id,
                        userName:
                            payload.name || payload.email || 'Unknown User',
                        avatarUrl: payload.avatarUrl || payload.avatar || null,
                        email: payload.email
                    }

                    this.logger.log(
                        `✅ [SETUP] JWT verification successful: ${authenticatedUser.userName} (${authenticatedUser.userId})`
                    )
                } catch (jwtError) {
                    this.logger.warn(
                        `⚠️ [SETUP] JWT verification failed: ${jwtError.message}`
                    )
                    // Continue with fallback authentication
                }
            }

            // Update user info
            if (authenticatedUser) {
                userInfo.userId = authenticatedUser.userId
                userInfo.userName = authenticatedUser.userName
                userInfo.avatarUrl = authenticatedUser.avatarUrl

                // Also set on client for other handlers
                client['user'] = {
                    uuid: authenticatedUser.userId,
                    id: authenticatedUser.userId,
                    name: authenticatedUser.userName,
                    email: authenticatedUser.email,
                    avatarUrl: authenticatedUser.avatarUrl
                }
                client.data = client.data || {}
                client.data.userId = authenticatedUser.userId
                client.data.userName = authenticatedUser.userName
                client.data.email = authenticatedUser.email
                client.data.avatarUrl = authenticatedUser.avatarUrl
            } else if (userId) {
                // Fallback to provided userId
                userInfo.userId = userId
                this.logger.log(
                    `⚠️ [SETUP] Using fallback authentication with userId: ${userId}`
                )
            } else {
                throw new Error('No authentication method succeeded')
            }

            this.connectedUsers.set(client.id, userInfo)

            const setupDuration = Date.now() - setupStartTime

            // Emit authenticated event to match Flutter expectations
            client.emit('authenticated', {
                status: 'success',
                userId: userInfo.userId,
                userName: userInfo.userName,
                message: 'User authenticated successfully',
                timestamp: new Date().toISOString(),
                setupDuration
            })

            // Emit setup completion event
            client.emit('setupComplete', {
                status: 'success',
                userId: userInfo.userId,
                userName: userInfo.userName,
                socketId: client.id,
                timestamp: new Date().toISOString(),
                setupDuration
            })

            this.logger.log(
                `✅ [SETUP] Setup completed successfully in ${setupDuration}ms: ${userInfo.userName} (${userInfo.userId})`
            )

            return {
                status: 'success',
                userId: userInfo.userId,
                userName: userInfo.userName,
                message: 'Setup completed successfully'
            }
        } catch (error) {
            const setupDuration = Date.now() - setupStartTime
            this.logger.error(
                `❌ [SETUP] Setup failed for socket ${client.id} in ${setupDuration}ms: ${error.message}`,
                error.stack
            )

            // Send error response but don't disconnect
            client.emit('setupError', {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString(),
                setupDuration
            })

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

            // Emit room join confirmation to all participants
            this.server.to(`room:${data.roomID}`).emit('roomJoinUpdate', {
                action: 'user_joined',
                roomId: data.roomID,
                userId: userId,
                userName: userName,
                participant: participant,
                seatIndex: participant.seatNumber - 1,
                roomUserCount: newCount,
                timestamp: new Date().toISOString()
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
        data: { userId: string; roomId: string; password?: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        // Use userId from message body, fallback to connected user info
        const userId = data.userId || userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `📥 JOIN_ROOM request: User ${userName} (${userId}) wants to join room ${data.roomId} as observer`
        )

        try {
            if (!data.roomId) {
                throw new Error('Room ID is required')
            }

            if (!userId) {
                throw new Error('User ID is required')
            }

            // Update tracking - user joins as observer initially for this specific room
            if (userInfo) {
                // Update userInfo with userId from message body if it was pending
                if (userInfo.userId === 'pending' && data.userId) {
                    userInfo.userId = data.userId
                    this.connectedUsers.set(client.id, userInfo)
                    this.logger.log(
                        `🔄 Updated pending user info with userId: ${data.userId}`
                    )
                }

                userInfo.rooms.add(data.roomId)
                this.logger.log(
                    `📝 User ${userName} (${userId}) tracking updated - now in rooms: [${Array.from(userInfo.rooms).join(', ')}]`
                )
            }

            // Join socket room for real-time updates immediately for this specific room
            client.join(`room:${data.roomId}`)
            this.logger.log(
                `🏠 User ${userName} (${userId}) joined socket room: room:${data.roomId}`
            )

            // Send immediate response to client - they've joined as observer
            const immediateResponse = {
                status: 'success',
                action: 'joined_as_observer',
                roomId: data.roomId,
                userId: userId,
                userName: userName,
                userRole: 'observer',
                message: 'Successfully joined room as observer',
                timestamp: new Date().toISOString()
            }

            // Emit immediate response to the joining client
            client.emit('joinRoomResponse', immediateResponse)

            this.logger.log(
                `✅ JOIN_ROOM immediate: User ${userName} (${userId}) joined room ${data.roomId} as observer`
            )

            // Now do the heavy database operations asynchronously
            setImmediate(async () => {
                try {
                    // Check if room exists and user has access
                    const roomDetails = await this.roomService.getRoomDetails(
                        data.roomId
                    )
                    if (!roomDetails) {
                        client.emit('roomError', {
                            error: 'Room not found',
                            roomId: data.roomId
                        })
                        return
                    }

                    // Check if room requires password
                    if (
                        roomDetails.password &&
                        roomDetails.password !== data.password
                    ) {
                        client.emit('roomError', {
                            error: 'Incorrect room password',
                            roomId: data.roomId
                        })
                        client.leave(`room:${data.roomId}`)
                        return
                    }

                    // Get current room state
                    await this.updateRoomSeatsState(data.roomId)
                    const currentSeats = this.roomSeats.get(data.roomId) || []
                    const roomUserCount =
                        this.roomUserCounts.get(data.roomId) || 0

                    // Get all participants (seated users) with proper format
                    const participants =
                        await this.roomService.getRoomParticipants(data.roomId)
                    const formattedParticipants = participants.map(
                        (participant) => ({
                            userId: participant.userId,
                            name:
                                participant.user?.name ||
                                participant.user?.email ||
                                'Unknown User',
                            avatar: participant.user?.avatarUrl || null,
                            seatIndex: participant.seatNumber - 1, // Convert to 0-based
                            isSpeaking: participant.isSpeaking || false,
                            micOn: !participant.isMuted, // micOn is inverse of isMuted
                            role: 'participant' // All seated users are participants
                        })
                    )

                    // Get waiting list info
                    const waitingList =
                        await this.roomService.getRoomWaitingList(data.roomId)
                    const userInWaitingList = waitingList.find(
                        (w) => w.userId === userId
                    )

                    // Check if current user is already a participant (seated)
                    const currentUserParticipant = formattedParticipants.find(
                        (p) => p.userId === userId
                    )

                    // Send detailed room data update
                    const roomDataUpdate = {
                        action: 'room_data_loaded',
                        roomId: data.roomId,
                        participants: formattedParticipants,
                        seats: currentSeats,
                        roomUserCount: roomUserCount,
                        waitingListPosition:
                            userInWaitingList?.position || null,
                        isParticipant: !!currentUserParticipant,
                        timestamp: new Date().toISOString()
                    }

                    // Emit room data to the client
                    client.emit('roomDataUpdate', roomDataUpdate)

                    // Emit to all room participants about new observer
                    this.server
                        .to(`room:${data.roomId}`)
                        .emit('roomJoinUpdate', formattedParticipants)

                    this.logger.log(
                        `📊 JOIN_ROOM data loaded: User ${userName} (${userId}) received room data for ${data.roomId}`
                    )

                    // Track user activity
                    this.trackUserActivity(userId, 'joinRoom')
                } catch (asyncError) {
                    this.logger.error(
                        `❌ JOIN_ROOM async data loading failed: ${asyncError.message}`,
                        asyncError.stack
                    )

                    client.emit('roomError', {
                        error: asyncError.message,
                        roomId: data.roomId
                    })
                }
            })

            return immediateResponse
        } catch (error) {
            this.logger.error(
                `❌ JOIN_ROOM failed: User ${userName} (${userId}) failed to join room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )

            const errorResponse = {
                status: 'error',
                message: error.message,
                roomId: data.roomId
            }

            // Emit error response directly to the client
            client.emit('joinRoomResponse', errorResponse)

            return errorResponse
        }
    }

    @SubscribeMessage('sitInSeat')
    async handleSitInSeat(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: { roomId: string; seatIndex: number; password?: string }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `🪑 SIT_IN_SEAT request: User ${userName} (${userId}) wants to sit in seat ${data.seatIndex} in room ${data.roomId}`
        )

        try {
            if (!data.roomId || data.seatIndex === undefined) {
                throw new Error('Room ID and seat index are required')
            }

            // Check if user is in the room (as observer) - if not, join them
            const roomName = `room:${data.roomId}`
            const isInSocketRoom = client.rooms.has(roomName)
            if (!isInSocketRoom) {
                // Automatically join the socket room if user is not already in it
                client.join(roomName)

                // Update tracking
                if (userInfo) {
                    userInfo.rooms.add(data.roomId)
                }

                this.logger.log(
                    `🔄 Auto-joined socket room: User ${userName} (${userId}) automatically joined room ${data.roomId} for sitting`
                )
            }

            // Get current room seats with lock information
            const currentSeats = await this.roomService.getRoomSeats(
                data.roomId
            )

            this.logger.log(
                `🔍 DEBUG SIT_IN_SEAT: Available seats for room ${data.roomId}: ${JSON.stringify(currentSeats.map((s) => ({ index: s.index, locked: s.locked, occupied: s.occupied })))}`
            )
            this.logger.log(
                `🔍 DEBUG SIT_IN_SEAT: Looking for seat with index: ${data.seatIndex}`
            )

            const targetSeat = currentSeats.find(
                (seat) => seat.index === data.seatIndex
            )

            if (!targetSeat) {
                throw new Error('Invalid seat index')
            }

            // Check seat availability and lock status
            if (targetSeat.occupied) {
                throw new Error('Seat is already occupied')
            }

            if (targetSeat.locked) {
                // If seat is locked, add to waiting list (simplified for now)
                // Note: Password check would need to be implemented with RoomSeat entity directly
                // Add to waiting list for this specific seat
                await this.roomService.addToWaitingList(data.roomId, userId)

                const waitingList = await this.roomService.getRoomWaitingList(
                    data.roomId
                )
                const userPosition =
                    waitingList.find((w) => w.userId === userId)?.position || 0

                const waitingResponse = {
                    status: 'waiting',
                    action: 'added_to_waiting_list',
                    roomId: data.roomId,
                    seatIndex: data.seatIndex,
                    userId: userId,
                    userName: userName,
                    position: userPosition,
                    message: `Seat ${data.seatIndex} is locked. Added to waiting list at position ${userPosition}`,
                    timestamp: new Date().toISOString()
                }

                // Emit to the user
                client.emit('sitInSeatResponse', waitingResponse)

                // Emit to all room participants
                this.server.to(roomName).emit('roomJoinUpdate', waitingResponse)

                this.logger.log(
                    `⏳ SIT_IN_SEAT waiting: User ${userName} (${userId}) added to waiting list for seat ${data.seatIndex} in room ${data.roomId}`
                )

                return waitingResponse
            }

            // Seat is available - proceed with sitting
            const participant = await this.roomService.joinRoomWithSeat(
                data.roomId,
                userId,
                data.seatIndex,
                data.password
            )

            // Update tracking
            const currentCount = this.roomUserCounts.get(data.roomId) || 0
            const newCount = currentCount + 1
            this.roomUserCounts.set(data.roomId, newCount)

            // Update seat state in memory
            await this.updateRoomSeatsState(data.roomId)
            const updatedSeats = this.roomSeats.get(data.roomId) || []

            // Format participant in the requested format (use participant data that already has user relation)
            const formattedParticipant = {
                userId: userId,
                name: participant.user?.name || userName,
                avatar:
                    participant.user?.avatarUrl || userInfo?.avatarUrl || null,
                seatIndex: data.seatIndex,
                isSpeaking: false,
                micOn: !participant.isMuted, // micOn is inverse of isMuted
                role: 'participant'
            }

            // Return participant in the requested format (matching joinRoom response)
            const response = formattedParticipant

            // Emit to the user who sat
            client.emit('sitInSeatResponse', formattedParticipant)

            // Notify all room participants about user sitting
            this.server.to(roomName).emit('userSeated', {
                roomId: data.roomId,
                participant,
                userName,
                seatIndex: data.seatIndex,
                userId: userId
            })

            // Broadcast updated seat state
            this.server.to(roomName).emit('seatUpdated', {
                roomId: data.roomId,
                seats: updatedSeats,
                action: 'user_seated',
                seatIndex: data.seatIndex,
                userId: userId
            })

            // Emit comprehensive room update with formatted participant
            this.server
                .to(roomName)
                .emit('roomJoinUpdate', formattedParticipant)

            // Check and promote from waiting list if needed
            await this.checkAndPromoteFromWaitingList(data.roomId)

            this.logger.log(
                `✅ SIT_IN_SEAT success: User ${userName} (${userId}) seated in seat ${data.seatIndex} in room ${data.roomId}`
            )

            // Track user activity
            this.trackUserActivity(userId, 'seatActions')

            return response
        } catch (error) {
            this.logger.error(
                `❌ SIT_IN_SEAT failed: User ${userName} (${userId}) failed to sit in seat ${data.seatIndex} in room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )

            const errorResponse = {
                status: 'error',
                message: error.message,
                roomId: data.roomId,
                seatIndex: data.seatIndex
            }

            // Emit error response directly to the client
            client.emit('sitInSeatResponse', errorResponse)

            return errorResponse
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

            // Update tracking - remove only this specific room
            if (userInfo) {
                userInfo.rooms.delete(roomId)
                this.logger.log(
                    `📝 User ${userName} (${userId}) tracking updated - now in rooms: [${Array.from(userInfo.rooms).join(', ')}]`
                )
            }

            const currentCount = this.roomUserCounts.get(roomId) || 0
            const newCount = Math.max(0, currentCount - 1)
            this.roomUserCounts.set(roomId, newCount)

            // Leave this specific socket room only
            client.leave(`room:${roomId}`)
            this.logger.log(
                `🚪 User ${userName} (${userId}) left socket room: room:${roomId}`
            )

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

            // Emit room leave confirmation to all participants
            this.server.to(`room:${roomId}`).emit('roomLeaveUpdate', {
                action: 'user_left',
                roomId: roomId,
                userId: userId,
                userName: userName,
                roomUserCount: newCount,
                timestamp: new Date().toISOString()
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

            // Emit comment activity update
            this.server.to(roomName).emit('commentActivityUpdate', {
                action: 'comment_added',
                roomId: data.roomId,
                commentId: comment.uuid,
                senderId: userId,
                senderName: userName,
                timestamp: new Date().toISOString()
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

            // Emit comment activity update
            this.server.to(roomName).emit('commentActivityUpdate', {
                action: 'comment_deleted',
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

            // Emit gift activity update
            this.server.to(`room:${data.roomId}`).emit('giftActivityUpdate', {
                action: 'gift_sent',
                roomId: data.roomId,
                transactionId: transaction.uuid,
                senderId: userId,
                senderName: userName,
                receiverId: data.receiverId,
                giftId: data.giftId,
                timestamp: new Date().toISOString()
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

            // Emit mute status update event
            this.server.to(`room:${data.roomId}`).emit('muteStatusUpdate', {
                action: isMuted ? 'muted' : 'unmuted',
                roomId: data.roomId,
                targetUserId: targetUserId,
                targetUserName: targetUserName,
                seatIndex: data.userInfo.seatIndex,
                isMuted: isMuted,
                micOn: micOn,
                actionBy: {
                    userId: userId,
                    userName: userName
                },
                timestamp: new Date().toISOString()
            })

            // Emit participant status change
            this.server
                .to(`room:${data.roomId}`)
                .emit('participantStatusUpdate', {
                    roomId: data.roomId,
                    userId: targetUserId,
                    userName: targetUserName,
                    status: {
                        isMuted: isMuted,
                        micOn: micOn
                    },
                    timestamp: new Date().toISOString()
                })

            this.logger.log(
                `✅ TOGGLE_MUTE success: User ${userName} (${userId}) ${isMuted ? 'muted' : 'unmuted'} seat ${data.userInfo.seatIndex} (${targetUserName}) in room ${data.roomId}`
            )

            // Create response
            const response = {
                status: 'success',
                roomId: data.roomId,
                userInfo: updatedUserInfo,
                message: `Successfully ${isMuted ? 'muted' : 'unmuted'} seat ${data.userInfo.seatIndex}`
            }

            // Emit response directly to the client that made the request
            client.emit('toggleMuteResponse', response)

            // Also return the response for any clients expecting a return value
            return response
        } catch (error) {
            this.logger.error(
                `❌ TOGGLE_MUTE failed: User ${userName} (${userId}) failed to toggle mute for seat ${data.userInfo.seatIndex} in room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )

            const errorResponse = {
                status: 'error',
                message: error.message,
                roomId: data.roomId
            }

            // Emit error response directly to the client
            client.emit('toggleMuteResponse', errorResponse)

            return errorResponse
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

            // Find the kicked user's socket to disconnect them from this specific room only
            const kickedUserSocket = Array.from(
                this.connectedUsers.entries()
            ).find(([socketId, user]) => user.userId === kickedUserId)

            if (kickedUserSocket) {
                const [kickedSocketId] = kickedUserSocket
                const kickedSocket =
                    this.server.sockets.sockets.get(kickedSocketId)
                if (kickedSocket) {
                    // Remove from this specific socket room only
                    kickedSocket.leave(`room:${data.roomId}`)
                    this.logger.log(
                        `🚪 Removed ${kickedUserName} (${kickedUserId}) from socket room: room:${data.roomId}`
                    )

                    // Update user's room tracking - remove only this specific room
                    const kickedUserInfo =
                        this.connectedUsers.get(kickedSocketId)
                    if (kickedUserInfo) {
                        kickedUserInfo.rooms.delete(data.roomId)
                        this.logger.log(
                            `📝 Updated ${kickedUserName} tracking - now in rooms: [${Array.from(kickedUserInfo.rooms).join(', ')}]`
                        )
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

            // Emit kick activity update
            this.server.to(`room:${data.roomId}`).emit('kickActivityUpdate', {
                action: 'user_kicked',
                roomId: data.roomId,
                kickedUserId: kickedUserId,
                kickedUserName: kickedUserName,
                seatIndex: data.seatIndex,
                kickedBy: {
                    userId: userId,
                    userName: userName
                },
                roomUserCount: newCount,
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

            // Emit comprehensive room update
            this.server.to(`room:${data.roomId}`).emit('roomUpdate', {
                action: 'participant_removed',
                roomId: data.roomId,
                removedUserId: kickedUserId,
                removedUserName: kickedUserName,
                seats: updatedSeats,
                participantCount: newCount,
                timestamp: new Date().toISOString()
            })

            this.logger.log(
                `✅ KICK_USER success: User ${userName} (${userId}) kicked ${kickedUserName} (${kickedUserId}) from room ${data.roomId} | Room users: ${newCount}`
            )

            // Create response
            const response = {
                status: 'success',
                participantID: kickedUserId,
                seatIndex: data.seatIndex,
                kickedUserId: kickedUserId,
                kickedUserName: kickedUserName,
                roomUserCount: newCount,
                message: `Successfully kicked ${kickedUserName}`
            }

            // Emit response directly to the client that made the request
            client.emit('kickUserResponse', response)

            // Also return the response for any clients expecting a return value
            return response
        } catch (error) {
            this.logger.error(
                `❌ KICK_USER failed: User ${userName} (${userId}) failed to kick user | Data: ${JSON.stringify(data)} | ` +
                    `Error: ${error.message}`,
                error.stack
            )

            const errorResponse = {
                status: 'error',
                message: error.message,
                participantID: data.participantID,
                seatIndex: data.seatIndex,
                roomId: data.roomId
            }

            // Emit error response directly to the client
            client.emit('kickUserResponse', errorResponse)

            return errorResponse
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

            // Emit deafen status update
            this.server.to(`room:${data.roomId}`).emit('deafenStatusUpdate', {
                action: data.isDeafened ? 'deafened' : 'undeafened',
                roomId: data.roomId,
                userId: userId,
                userName: userName,
                isDeafened: data.isDeafened,
                timestamp: new Date().toISOString()
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

            // Emit video status update
            this.server.to(`room:${data.roomId}`).emit('videoStatusUpdate', {
                action: data.isVideoOn ? 'video_on' : 'video_off',
                roomId: data.roomId,
                userId: userId,
                userName: userName,
                isVideoOn: data.isVideoOn,
                timestamp: new Date().toISOString()
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

            // Emit speaking status update (to all participants including sender for UI feedback)
            this.server.to(`room:${data.roomId}`).emit('speakingStatusUpdate', {
                action: data.isSpeaking
                    ? 'started_speaking'
                    : 'stopped_speaking',
                roomId: data.roomId,
                userId: userId,
                userName: userName,
                isSpeaking: data.isSpeaking,
                timestamp: new Date().toISOString()
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

    // ==================== UTILITY METHODS ====================

    /**
     * Emit comprehensive room state update to all participants
     */
    private async emitRoomStateUpdate(
        roomId: string,
        action: string,
        additionalData: any = {}
    ) {
        try {
            const roomUserCount = this.roomUserCounts.get(roomId) || 0
            const seats = this.roomSeats.get(roomId) || []
            const participants =
                await this.roomService.getRoomParticipants(roomId)

            this.server.to(`room:${roomId}`).emit('roomStateUpdate', {
                action,
                roomId,
                roomUserCount,
                seats,
                participantCount: participants.length,
                timestamp: new Date().toISOString(),
                ...additionalData
            })
        } catch (error) {
            this.logger.error(
                `Failed to emit room state update for room ${roomId}: ${error.message}`
            )
        }
    }

    /**
     * Emit user activity tracking event
     */
    private emitUserActivityUpdate(
        userId: string,
        userName: string,
        activity: string,
        roomId?: string,
        additionalData: any = {}
    ) {
        const eventData = {
            action: activity,
            userId,
            userName,
            timestamp: new Date().toISOString(),
            ...additionalData
        }

        if (roomId) {
            eventData.roomId = roomId
            this.server
                .to(`room:${roomId}`)
                .emit('userActivityUpdate', eventData)
        }

        // Also emit to user's personal channel
        this.server.to(`user:${userId}`).emit('activityUpdate', eventData)
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
            // Redirect to sitInSeat handler for seat-specific requests
            if (data.seatIndex !== undefined) {
                return await this.handleSitInSeat(client, {
                    roomId: data.roomId,
                    seatIndex: data.seatIndex
                })
            } else {
                // Find any available seat automatically
                const availableSeats = await this.roomService.getRoomSeats(
                    data.roomId
                )
                const emptySeat = availableSeats.find(
                    (seat) => !seat.occupied && !seat.locked
                )

                if (emptySeat) {
                    return await this.handleSitInSeat(client, {
                        roomId: data.roomId,
                        seatIndex: emptySeat.index
                    })
                } else {
                    throw new Error('No available seats found')
                }
            }
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
        data: {
            userId: string
            roomId: string
            seatIndex: number
            isLocked: boolean
        }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        // Use userId from message body, fallback to connected user info
        const userId = data.userId || userInfo?.userId
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

            if (!userId) {
                throw new Error('User ID is required')
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
                seatIndex: data.seatIndex,
                isLocked: data.isLocked
            }
        } catch (error) {
            this.logger.error(
                `❌ TOGGLE_SEAT_LOCK failed: ${error.message}`,
                error.stack
            )
            return {
                seatIndex: data.seatIndex,
                isLocked: false, // Return false on error as seat lock operation failed
                error: error.message
            }
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
     * Check and promote users from waiting list when seats become available
     */
    private async checkAndPromoteFromWaitingList(
        roomId: string
    ): Promise<void> {
        try {
            const waitingList =
                await this.roomService.getRoomWaitingList(roomId)
            const availableSeats = await this.roomService.getRoomSeats(roomId)

            // Find empty unlocked seats
            const emptyUnlockedSeats = availableSeats.filter(
                (seat) => !seat.occupied && !seat.locked
            )

            if (waitingList.length > 0 && emptyUnlockedSeats.length > 0) {
                // Promote first user in waiting list
                const nextUser = waitingList[0]
                const availableSeat = emptyUnlockedSeats[0]

                try {
                    // Promote the user
                    await this.roomService.promoteFromWaitingList(roomId)

                    // Auto-seat the promoted user
                    const participant = await this.roomService.joinRoomWithSeat(
                        roomId,
                        nextUser.userId,
                        availableSeat.index
                    )

                    // Update seat state
                    await this.updateRoomSeatsState(roomId)
                    const updatedSeats = this.roomSeats.get(roomId) || []

                    // Notify all room participants
                    this.server
                        .to(`room:${roomId}`)
                        .emit('userPromotedFromWaitingList', {
                            roomId,
                            userId: nextUser.userId,
                            userName: nextUser.user?.name || 'Unknown User',
                            seatIndex: availableSeat.index,
                            participant,
                            seats: updatedSeats,
                            message: `User promoted from waiting list to seat ${availableSeat.index}`,
                            timestamp: new Date().toISOString()
                        })

                    // Emit room update
                    this.server.to(`room:${roomId}`).emit('roomJoinUpdate', {
                        action: 'user_promoted_and_seated',
                        roomId,
                        userId: nextUser.userId,
                        userName: nextUser.user?.name || 'Unknown User',
                        seatIndex: availableSeat.index,
                        userRole: 'participant',
                        seats: updatedSeats,
                        timestamp: new Date().toISOString()
                    })

                    this.logger.log(
                        `✅ Promoted user ${nextUser.userId} from waiting list to seat ${availableSeat.index} in room ${roomId}`
                    )
                } catch (error) {
                    this.logger.error(
                        `❌ Failed to promote user ${nextUser.userId} from waiting list in room ${roomId}: ${error.message}`
                    )
                }
            }
        } catch (error) {
            this.logger.error(
                `❌ Failed to check waiting list for room ${roomId}: ${error.message}`
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
