import { Logger, UseGuards, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
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
import { RoomRole } from './entities/room-role.entity'
import { RoomService } from './room.service'
import { User } from '../user/entities/user.entity'

@WebSocketGateway({
    cors: {
        origin: '*'
    }
})
// @UseGuards(WsJwtGuard) // Temporarily disabled for testing
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

    // Comment emission tracking to prevent duplicates
    private sentCommentResponses = new Map<string, Set<string>>() // commentId -> Set of clientIds

    // SitInSeat response tracking to prevent duplicates
    private sentSitInSeatResponses = new Map<string, Set<string>>() // requestKey -> Set of clientIds

    // GetRoomComments response tracking to prevent duplicates
    private sentGetCommentsResponses = new Map<string, Set<string>>() // requestKey -> Set of clientIds

    // BlockUser response tracking to prevent duplicates
    private sentBlockUserResponses = new Map<string, Set<string>>() // requestKey -> Set of clientIds

    constructor(
        private readonly roomService: RoomService,
        private readonly giftService: GiftService,
        private readonly jwtService: JwtService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>
    ) {}

    afterInit(server: Server) {
        this.server = server
        this.logger.log('🚀 Room Gateway initialized successfully')
        this.logger.log(`📡 WebSocket namespace: / (root/default)`)
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

    private async getUserInfo(
        client: Socket,
        fallbackUserId?: string
    ): Promise<{ userId: string; userName: string } | null> {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = fallbackUserId || userInfo?.userId
        let userName = userInfo?.userName

        this.logger.debug(
            `🔍 getUserInfo - userInfo from cache: ${JSON.stringify(userInfo)}`
        )
        this.logger.debug(`🔍 getUserInfo - fallbackUserId: ${fallbackUserId}`)
        this.logger.debug(`🔍 getUserInfo - final userId: ${userId}`)
        this.logger.debug(`🔍 getUserInfo - userName from cache: ${userName}`)

        // If no userName available, or if it's a placeholder, try to get it from the database
        if (
            (!userName ||
                userName === 'Unknown User' ||
                userName === 'Pending User') &&
            userId &&
            userId !== 'pending'
        ) {
            try {
                const user = await this.roomService.findUserById(userId)
                userName = user?.name || user?.email
                this.logger.debug(
                    `🔍 getUserInfo - userName from DB: ${userName}`
                )
            } catch (error) {
                this.logger.debug(
                    `Could not fetch user info for ${userId}: ${error.message}`
                )
            }
        }

        // Return null if we don't have complete user information
        if (
            !userId ||
            !userName ||
            userId === 'pending' ||
            userName === 'Unknown User' ||
            userName === 'Pending User'
        ) {
            this.logger.debug(
                `🔍 getUserInfo - returning null (userId: ${userId}, userName: ${userName})`
            )
            return null
        }

        this.logger.debug(
            `🔍 getUserInfo - returning: ${JSON.stringify({ userId, userName })}`
        )
        return { userId, userName }
    }

    async handleConnection(client: Socket) {
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
        this.logger.log(`   ├─ URL: ${client.handshake.url || 'Not provided'}`)

        // More focused handshake logging
        this.logger.log(
            `   ├─ Query: ${JSON.stringify(client.handshake.query)}`
        )
        this.logger.log(`   ├─ Auth: ${JSON.stringify(client.handshake.auth)}`)

        this.logger.log(
            `   └─ Total Active Connections: ${this.connectedUsers.size + 1}`
        )
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

            this.logger.log(`🔐 [AUTH] Authentication sources checked:`)
            this.logger.log(
                `   ├─ Auth header token: ${client.handshake.auth?.token ? 'Found' : 'Not found'}`
            )
            this.logger.log(
                `   ├─ Query param token: ${client.handshake.query?.token ? 'Found' : 'Not found'}`
            )
            this.logger.log(
                `   ├─ URL path token: ${this.extractTokenFromUrl(client.handshake.url || '') ? 'Found' : 'Not found'}`
            )
            this.logger.log(
                `   └─ Final token status: ${token ? 'Available' : 'None'}`
            )

            if (token && !userId) {
                this.logger.log(
                    `🔑 [AUTH] Found JWT token, will authenticate in setup event...`
                )
                this.logger.log(`   ├─ Token Length: ${token.length} chars`)
                this.logger.log(
                    `   └─ Token Preview: ${token.substring(0, 30)}...`
                )

                // Try immediate JWT verification for better connection handling
                try {
                    const payload = await this.jwtService.verifyAsync(token)
                    userId = payload.uuid || payload.id
                    userName = payload.name || payload.email || 'Unknown User'
                    avatarUrl = payload.avatarUrl || payload.avatar || null

                    this.logger.log(
                        `✅ [AUTH] Immediate JWT verification successful: ${userName} (${userId})`
                    )

                    // Set user data on client for other handlers
                    client['user'] = payload
                    client.data = client.data || {}
                    client.data.userId = userId
                    client.data.userName = userName
                    client.data.email = payload.email
                    client.data.avatarUrl = avatarUrl
                } catch (jwtError) {
                    this.logger.warn(
                        `⚠️ [AUTH] Immediate JWT verification failed: ${jwtError.message} - Will retry in setup`
                    )
                }
            } else if (!token) {
                this.logger.log(`⚠️ [AUTH] No JWT token found in any source`)
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
                `✅ [CONNECTION] Connection established: ${userName || 'Pending'} (${userId || 'pending'}) | Socket: ${client.id}`
            )

            // Send connection acknowledgment immediately with authentication status
            client.emit('connected', {
                success: true,
                message: 'Connected to Room Gateway',
                socketId: client.id,
                timestamp: connectionTime,
                authenticated: !!userId,
                authMethod: token
                    ? userId
                        ? 'jwt_verified'
                        : 'jwt_pending'
                    : 'none',
                userId: userId || null,
                userName: userName || null
            })

            // Also emit connection status update
            client.emit('connectionStatusUpdate', {
                status: 'connected',
                socketId: client.id,
                timestamp: connectionTime,
                gateway: 'room',
                authenticated: !!userId,
                tokenFound: !!token
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
            this.logger.log(`🔍 [TOKEN] Extracting token from URL: ${url}`)

            // Handle both query params and path-based tokens
            const urlParts = url.split('/')

            // Check if token is in the path (last segment)
            const lastSegment = urlParts[urlParts.length - 1]
            if (lastSegment && lastSegment.startsWith('eyJ')) {
                this.logger.log(
                    `🎯 [TOKEN] Found token in URL path: ${lastSegment.substring(0, 20)}...`
                )
                return lastSegment
            }

            // Also check for token in query parameters
            if (url.includes('?')) {
                const queryString = url.split('?')[1]
                const params = new URLSearchParams(queryString)
                const queryToken =
                    params.get('token') ||
                    params.get('auth') ||
                    params.get('jwt')

                if (queryToken && queryToken.startsWith('eyJ')) {
                    this.logger.log(
                        `🎯 [TOKEN] Found token in query params: ${queryToken.substring(0, 20)}...`
                    )
                    return queryToken
                }
            }

            this.logger.log(`⚠️ [TOKEN] No valid JWT token found in URL`)
            return null
        } catch (error) {
            this.logger.warn(
                `❌ [TOKEN] Failed to extract token from URL: ${error.message}`
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

    async handleDisconnect(client: Socket) {
        try {
            const userInfo = this.connectedUsers.get(client.id)

            if (userInfo) {
                this.logger.log(
                    `🔌 User ${userInfo.userName} (${userInfo.userId}) disconnecting from rooms: [${Array.from(userInfo.rooms).join(', ')}]`
                )

                // Leave all rooms user was in and handle seat cleanup for each specific room
                await Promise.all(
                    Array.from(userInfo.rooms).map(async (roomId) => {
                        try {
                            this.logger.log(
                                `🚪 Processing disconnect for user ${userInfo.userName} from room ${roomId}`
                            )

                            // Remove user only if they are a participant (seated) in this specific room
                            try {
                                await this.roomService.leaveRoom(
                                    roomId,
                                    userInfo.userId
                                )
                                this.logger.log(
                                    `✅ User ${userInfo.userName} successfully left room ${roomId}`
                                )
                            } catch (err) {
                                // leaveRoom is idempotent now - this is expected for observers/hosts
                                this.logger.debug(
                                    `ℹ️ leaveRoom: User ${userInfo.userId} was not a seated participant in room ${roomId} (expected for observers/hosts)`
                                )
                                // Don't re-throw - this is normal behavior for observers/hosts
                            }

                            // Update seat state in memory for this specific room
                            await this.updateRoomSeatsState(roomId)

                            // Get updated seat information for this specific room
                            const updatedSeats =
                                this.roomSeats.get(roomId) || []

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
                            this.server
                                .to(`room:${roomId}`)
                                .emit('seatUpdated', {
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
                            // Don't re-throw to avoid breaking the disconnect process for other rooms
                        }
                    })
                )

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
            if (userInfo && userInfo.userId === 'pending' && data.useId) {
                userInfo.userId = data.useId
                this.connectedUsers.set(client.id, userInfo)
            }

            // All users join as observers initially - they must explicitly sit in a seat
            const roomDetails = await this.roomService.getRoomDetails(
                data.roomID
            )

            let participant: any = null
            let joinedAsObserver = true

            // No automatic seat assignment - users must tap on a seat to sit
            this.logger.log(
                `�️ ROOM_ID: User ${userName} (${userId}) joined room ${data.roomID} as observer (must tap seat to sit)`
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

            if (participant) {
                // Notify all room participants about user joining
                this.server.to(`room:${data.roomID}`).emit('userJoined', {
                    roomId: data.roomID,
                    participant,
                    userName,
                    seatIndex: participant.seatNumber - 1
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
                    `✅ ROOM_ID success: User ${userName} (${userId}) joined room ${data.roomID} | Seat: ${participant.seatNumber - 1} | Room users: ${newCount}`
                )
            } else if (joinedAsObserver) {
                // Emit observer join update
                this.server.to(`room:${data.roomID}`).emit('roomJoinUpdate', {
                    action: 'observer_joined',
                    roomId: data.roomID,
                    userId: userId,
                    userName: userName,
                    participant: null,
                    seatIndex: null,
                    roomUserCount: newCount,
                    timestamp: new Date().toISOString()
                })

                this.logger.log(
                    `✅ ROOM_ID observer: User ${userName} (${userId}) joined room ${data.roomID} as observer | Room users: ${newCount}`
                )
            }

            // Broadcast updated seat state
            this.server.to(`room:${data.roomID}`).emit('seatUpdated', {
                roomId: data.roomID,
                seats: updatedSeats
            })

            // Track user activity
            this.trackUserActivity(userId, 'joinRoom')

            return participant
                ? {
                      status: 'success',
                      participant,
                      seatIndex: participant.seatNumber - 1,
                      seats: updatedSeats,
                      roomUserCount: newCount,
                      message: `Successfully joined room ${data.roomID}`
                  }
                : {
                      status: 'success',
                      participant: null,
                      seatIndex: null,
                      seats: updatedSeats,
                      roomUserCount: newCount,
                      message: 'Joined as observer. Tap on a seat to sit down.'
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
        data: {
            userId: string
            roomID?: string
            password?: string
        }
    ) {
        this.logger.debug(`📥 JOIN_ROOM raw data: ${JSON.stringify(data)}`)

        // Handle both roomId and roomID formats
        const roomId = data.roomID

        // Get validated user information
        const validatedUser = await this.getUserInfo(client, data.userId)

        this.logger.debug(`🔍 Validated user: ${JSON.stringify(validatedUser)}`)

        if (!validatedUser) {
            this.logger.warn(
                `⚠️ JOIN_ROOM: User validation failed for socket ${client.id} with data ${JSON.stringify(data)}`
            )
            // Don't emit joinRoomResponse for validation errors
            // Flutter code expects only valid participant data
            this.logger.log(
                `📤 JOIN_ROOM: No joinRoomResponse emitted - user validation failed`
            )
            return null
        }

        const { userId, userName } = validatedUser

        // Get the userInfo for tracking (from connectedUsers)
        const userInfo = this.connectedUsers.get(client.id)

        this.logger.log(
            `📥 JOIN_ROOM request: User ${userName} (${userId}) wants to join room ${roomId} as observer`
        )

        try {
            if (!roomId) {
                throw new Error(
                    `Room ID is required. Received data: ${JSON.stringify(data)}`
                )
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

                userInfo.rooms.add(roomId)
                this.logger.log(
                    `📝 User ${userName} (${userId}) tracking updated - now in rooms: [${Array.from(userInfo.rooms).join(', ')}]`
                )
            }

            // Join socket room for real-time updates immediately for this specific room
            client.join(`room:${roomId}`)
            this.logger.log(
                `🏠 User ${userName} (${userId}) joined socket room: room:${roomId}`
            )

            // Do room validation and get participant data BEFORE sending response
            // Check if room exists and user has access
            const roomDetails = await this.roomService.getRoomDetails(roomId)
            if (!roomDetails) {
                client.emit('roomError', {
                    error: 'Room not found',
                    roomId: roomId
                })
                return null
            }

            // Check if room requires password
            if (
                roomDetails.password &&
                roomDetails.password !== data.password
            ) {
                client.emit('roomError', {
                    error: 'Incorrect room password',
                    roomId: roomId
                })
                client.leave(`room:${roomId}`)
                return null
            }

            // Get current participant data for this user
            const participants =
                await this.roomService.getRoomParticipants(roomId)
            this.logger.debug(
                `🔍 JOIN_ROOM: Found ${participants.length} participants in room ${roomId}`
            )

            const currentUserParticipant = participants.find(
                (participant) => participant.userId === userId
            )

            this.logger.debug(
                `🔍 JOIN_ROOM: User ${userId} participant status: ${currentUserParticipant ? 'SEATED' : 'OBSERVER'}`
            )

            // Format participant data if user is seated
            const participantData = currentUserParticipant
                ? {
                      userId: currentUserParticipant.userId,
                      name:
                          currentUserParticipant.user?.name ||
                          currentUserParticipant.user?.email ||
                          userName,
                      avatar: currentUserParticipant.user?.avatarUrl || null,
                      seatIndex: currentUserParticipant.seatNumber - 1,
                      isSpeaking: currentUserParticipant.isSpeaking || false,
                      micOn: !currentUserParticipant.isMuted,
                      role: 'participant'
                  }
                : null

            // Only emit joinRoomResponse when user is actually seated
            if (participantData) {
                this.logger.log(
                    `📤 JOIN_ROOM: Emitting joinRoomResponse to socket ${client.id} with participant: ${participantData.name} (${participantData.userId})`
                )
                this.logger.debug(
                    `📤 JOIN_ROOM: Response data: ${JSON.stringify(participantData)}`
                )
                client.emit('joinRoomResponse', participantData)
            } else {
                this.logger.log(
                    `ℹ️ JOIN_ROOM: User ${userName} (${userId}) joined as observer - no joinRoomResponse emitted`
                )
            }

            this.logger.log(
                `✅ JOIN_ROOM complete: User ${userName} (${userId}) joined room ${roomId} as ${participantData ? 'participant' : 'observer'}`
            )

            // Now do the additional room data operations asynchronously
            setImmediate(async () => {
                try {
                    // Get current room state
                    await this.updateRoomSeatsState(roomId)
                    const currentSeats = this.roomSeats.get(roomId) || []
                    const roomUserCount = this.roomUserCounts.get(roomId) || 0

                    // Get all participants (seated users) with proper format
                    const allParticipants =
                        await this.roomService.getRoomParticipants(roomId)
                    const formattedParticipants = allParticipants
                        .filter(
                            (participant) =>
                                participant.user?.name ||
                                participant.user?.email
                        )
                        .map((participant) => ({
                            userId: participant.userId,
                            name:
                                participant.user?.name ||
                                participant.user?.email,
                            avatar: participant.user?.avatarUrl || null,
                            seatIndex: participant.seatNumber - 1, // Convert to 0-based
                            isSpeaking: participant.isSpeaking || false,
                            micOn: !participant.isMuted, // micOn is inverse of isMuted
                            role: 'participant' // All seated users are participants
                        }))

                    // Get waiting list info
                    const waitingList =
                        await this.roomService.getRoomWaitingList(roomId)
                    const userInWaitingList = waitingList.find(
                        (w) => w.id === userId
                    )

                    // Send detailed room data update
                    const roomDataUpdate = {
                        action: 'room_data_loaded',
                        roomId: roomId,
                        participants: formattedParticipants,
                        seats: currentSeats,
                        roomUserCount: roomUserCount,
                        waitingListPosition: userInWaitingList?.sitIndex
                            ? parseInt(userInWaitingList.sitIndex)
                            : null,
                        isParticipant: !!participantData,
                        timestamp: new Date().toISOString()
                    }

                    // Emit room data to the client
                    client.emit('roomDataUpdate', roomDataUpdate)

                    // Emit to all room participants about new user joining
                    this.server.to(`room:${roomId}`).emit(
                        'roomJoinUpdate',
                        participantData || {
                            userId: userId,
                            name: userName,
                            avatar: null,
                            seatIndex: null,
                            isSpeaking: false,
                            micOn: false,
                            role: 'observer'
                        }
                    )

                    this.logger.log(
                        `📊 JOIN_ROOM data loaded: User ${userName} (${userId}) received room data for ${roomId}`
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
                        roomId: roomId
                    })
                }
            })

            return participantData
        } catch (error) {
            this.logger.error(
                `❌ JOIN_ROOM failed: User ${userName} (${userId}) failed to join room ${roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )

            // Don't emit joinRoomResponse for errors - Flutter expects only valid participant data
            this.logger.log(
                `📤 JOIN_ROOM: No joinRoomResponse emitted - operation failed`
            )

            return null
        }
    }

    @SubscribeMessage('sitInSeat')
    async handleSitInSeat(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId?: string
            seatIndex: number
            userId?: string
            password?: string
        }
    ) {
        const roomId = data.roomId

        // Get validated user information
        const validatedUser = await this.getUserInfo(client, data.userId)
        if (!validatedUser) {
            client.emit('sitInSeatResponse', {
                status: 'rejected',
                message: 'User information not available',
                user: {
                    id: data.userId || '',
                    name: '',
                    email: '',
                    sitIndex: data.seatIndex?.toString() || '',
                    image: ''
                }
            })
            return
        }

        const { userId, userName } = validatedUser

        this.logger.log(
            `🪑 SIT_IN_SEAT: User ${userName} (${userId}) wants to sit in seat ${data.seatIndex} in room ${roomId}`
        )

        try {
            // Validate inputs
            if (!roomId) {
                throw new Error('Room ID is required')
            }
            if (data.seatIndex === undefined) {
                throw new Error('Seat index is required')
            }

            // Auto-join socket room if not already joined
            const roomName = `room:${roomId}`
            if (!client.rooms.has(roomName)) {
                client.join(roomName)
                const userInfo = this.connectedUsers.get(client.id)
                if (userInfo) {
                    userInfo.rooms.add(roomId)
                }
            }

            // Get current room seats and room details
            const currentSeats = await this.roomService.getRoomSeats(roomId)
            const targetSeat = currentSeats.find(
                (seat) => seat.index === data.seatIndex
            )

            if (!targetSeat) {
                throw new Error('Invalid seat index')
            }

            // Special handling for admin seat (-1)
            if (data.seatIndex === -1) {
                // Check if user is admin/host/owner
                const userRoles = await this.roomService.getUserRolesInRoom(
                    roomId,
                    userId
                )
                const isAdmin =
                    userRoles.includes(RoomRole.ADMIN) ||
                    userRoles.includes(RoomRole.HOST) ||
                    userRoles.includes(RoomRole.OWNER)

                if (!isAdmin) {
                    throw new Error(
                        'Only admins, hosts, or owners can sit in the admin seat'
                    )
                }

                // If seat is occupied, send request instead
                if (targetSeat.occupied) {
                    this.logger.log(
                        `📝 Admin seat occupied, triggering request for user ${userName} (${userId})`
                    )

                    // Redirect to request handler
                    return this.handleRequestAdminSeat(client, {
                        roomId,
                        userId
                    })
                }
            }

            // Check if seat is occupied (for non-admin seats or empty admin seat)
            if (targetSeat.occupied) {
                throw new Error('Seat is already occupied')
            }

            // Get room details and user roles
            const roomDetails = await this.roomService.getRoomDetails(roomId)
            const userRoles = await this.roomService.getUserRolesInRoom(
                roomId,
                userId
            )
            const isAdmin =
                userRoles.includes(RoomRole.ADMIN) ||
                userRoles.includes(RoomRole.OWNER)

            // Check if seat is locked (only admins can override locked seats)
            if (targetSeat.locked && !isAdmin) {
                // Seat is locked and user is not host - add to waiting list
                this.logger.log(
                    `⏳ SIT_IN_SEAT: Seat ${data.seatIndex} is locked. Adding user ${userName} (${userId}) to waiting list for room ${roomId}`
                )

                // Add user to waiting list for this specific seat
                await this.roomService.addToWaitingList(roomId, userId)

                const userInfo = await this.roomService.findUserById(userId)
                const waitingResponse = {
                    status: 'waiting',
                    message:
                        'Seat is locked. Added to waiting list for host approval.',
                    user: {
                        id: userId,
                        name: userInfo?.name || userName,
                        email: userInfo?.email || '',
                        sitIndex: data.seatIndex.toString(),
                        image: userInfo?.avatarUrl || ''
                    }
                }

                client.emit('sitInSeatResponse', waitingResponse)

                // Notify host about the waiting participant
                const hostSockets = Array.from(this.connectedUsers.entries())
                    .filter(
                        ([_, userInfo]) =>
                            userInfo.userId === roomDetails?.hostId
                    )
                    .map(([socketId]) => socketId)

                hostSockets.forEach((socketId) => {
                    this.server.to(socketId).emit('participantWaiting', {
                        roomId,
                        participantId: userId,
                        participantName: userInfo?.name || userName,
                        seatIndex: data.seatIndex,
                        timestamp: new Date().toISOString()
                    })
                })

                this.logger.log(
                    `⏳ SIT_IN_SEAT: User ${userName} (${userId}) added to waiting list for seat ${data.seatIndex} in room ${roomId}`
                )

                // Track user activity
                this.trackUserActivity(userId, 'seatActions')
                return waitingResponse
            }

            // Seat is available and unlocked (or user is admin) - proceed with sitting
            const participant = await this.roomService.joinRoomWithSeat(
                roomId,
                userId,
                data.seatIndex,
                data.password
            )

            // If user sits in seat 0 (index 0), they become the host
            if (data.seatIndex === 0) {
                try {
                    const currentHostId = roomDetails?.hostId

                    // Only transfer ownership if the user is not already the host
                    if (currentHostId !== userId) {
                        await this.roomService.transferRoomOwnership(
                            roomId,
                            userId,
                            currentHostId || roomDetails?.ownerId || userId
                        )

                        this.logger.log(
                            `👑 SIT_IN_SEAT: User ${userName} (${userId}) became host by sitting in seat 0 in room ${roomId}`
                        )

                        // Broadcast host change to all room participants
                        this.server.to(`room:${roomId}`).emit('hostChanged', {
                            roomId,
                            newHostId: userId,
                            newHostName: participant.user?.name || userName,
                            previousHostId: currentHostId,
                            timestamp: new Date().toISOString(),
                            reason: 'seat_0_assignment'
                        })
                    }
                } catch (error) {
                    this.logger.warn(
                        `⚠️ SIT_IN_SEAT: Failed to transfer host role to ${userName} (${userId}) for seat 0 in room ${roomId}: ${error.message}`
                    )
                }
            }

            // Update seat state in memory
            await this.updateRoomSeatsState(roomId)

            // Success response
            const response = {
                status: 'accepted',
                message: `Successfully seated in seat ${data.seatIndex}`,
                user: {
                    id: userId,
                    name: participant.user?.name || userName,
                    email: participant.user?.email || '',
                    sitIndex: data.seatIndex.toString(),
                    image: participant.user?.avatarUrl || ''
                }
            }

            client.emit('sitInSeatResponse', response)

            // Broadcast seat update to all room participants
            this.server.to(`room:${roomId}`).emit('seatUpdated', {
                roomId,
                seatIndex: data.seatIndex,
                occupied: true,
                user: {
                    id: userId,
                    name: participant.user?.name || userName,
                    avatar: participant.user?.avatarUrl || ''
                },
                timestamp: new Date().toISOString()
            })

            // Send joinRoomResponse to the user who just sat down
            const joinRoomResponseData = {
                userId: userId,
                name: participant.user?.name || userName,
                avatar: participant.user?.avatarUrl || null,
                seatIndex: data.seatIndex,
                isSpeaking: false,
                micOn: !participant.isMuted, // micOn is inverse of isMuted
                role: 'participant'
            }

            client.emit('joinRoomResponse', joinRoomResponseData)

            this.logger.log(
                `✅ SIT_IN_SEAT success: User ${userName} (${userId}) seated in seat ${data.seatIndex} in room ${roomId}`
            )

            // Track user activity
            this.trackUserActivity(userId, 'seatActions')

            return response
        } catch (error) {
            this.logger.error(
                `❌ SIT_IN_SEAT failed: User ${userName} (${userId}) failed to sit in seat ${data.seatIndex} in room ${roomId} | Error: ${error.message}`
            )

            const errorResponse = {
                status: 'rejected',
                message: error.message,
                user: {
                    id: userId,
                    name: userName,
                    email: '',
                    sitIndex: data.seatIndex?.toString() || '',
                    image: ''
                }
            }

            client.emit('sitInSeatResponse', errorResponse)
            return errorResponse
        }
    }

    @SubscribeMessage('requestAdminSeat')
    async handleRequestAdminSeat(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId: string
            userId?: string
        }
    ) {
        const validatedUser = await this.getUserInfo(client, data.userId)
        if (!validatedUser) {
            client.emit('requestAdminSeatResponse', {
                status: 'rejected',
                message: 'User information not available'
            })
            return
        }

        const { userId, userName } = validatedUser

        this.logger.log(
            `📝 REQUEST_ADMIN_SEAT: User ${userName} (${userId}) requesting admin seat in room ${data.roomId}`
        )

        try {
            const result = await this.roomService.requestAdminSeat(
                data.roomId,
                userId
            )

            // Notify the requester
            client.emit('requestAdminSeatResponse', {
                status: 'pending',
                message: 'Admin seat request sent successfully',
                requestId: result.requestId
            })

            // Find the current admin and notify them
            const adminSockets = Array.from(this.connectedUsers.entries())
                .filter(
                    ([_, userInfo]) => userInfo.userId === result.currentAdminId
                )
                .map(([socketId]) => socketId)

            adminSockets.forEach((socketId) => {
                this.server.to(socketId).emit('adminSeatRequested', {
                    roomId: data.roomId,
                    requestId: result.requestId,
                    requesterId: userId,
                    requesterName: userName,
                    timestamp: new Date().toISOString()
                })
            })

            this.logger.log(
                `✅ REQUEST_ADMIN_SEAT: Request ${result.requestId} sent to admin ${result.currentAdminId}`
            )

            return { status: 'pending', requestId: result.requestId }
        } catch (error) {
            this.logger.error(`❌ REQUEST_ADMIN_SEAT failed: ${error.message}`)

            client.emit('requestAdminSeatResponse', {
                status: 'rejected',
                message: error.message
            })

            return { status: 'rejected', message: error.message }
        }
    }

    @SubscribeMessage('approveAdminSeatRequest')
    async handleApproveAdminSeatRequest(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId: string
            requestId: string
            requesterId: string
            approved: boolean
            userId?: string
        }
    ) {
        const validatedUser = await this.getUserInfo(client, data.userId)
        if (!validatedUser) {
            client.emit('approveAdminSeatResponse', {
                status: 'rejected',
                message: 'User information not available'
            })
            return
        }

        const { userId: approverId, userName } = validatedUser

        this.logger.log(
            `🔍 APPROVE_ADMIN_SEAT: User ${userName} (${approverId}) ${data.approved ? 'approving' : 'rejecting'} request ${data.requestId}`
        )

        try {
            if (!data.approved) {
                // Rejection - notify requester
                const requesterSockets = Array.from(
                    this.connectedUsers.entries()
                )
                    .filter(
                        ([_, userInfo]) => userInfo.userId === data.requesterId
                    )
                    .map(([socketId]) => socketId)

                requesterSockets.forEach((socketId) => {
                    this.server.to(socketId).emit('adminSeatRequestRejected', {
                        roomId: data.roomId,
                        requestId: data.requestId,
                        message: 'Admin seat request was rejected',
                        timestamp: new Date().toISOString()
                    })
                })

                client.emit('approveAdminSeatResponse', {
                    status: 'success',
                    message: 'Request rejected successfully'
                })

                this.logger.log(
                    `❌ APPROVE_ADMIN_SEAT: Request ${data.requestId} rejected by ${userName}`
                )

                return { status: 'success', message: 'Request rejected' }
            }

            // Approval - swap seats
            const result = await this.roomService.approveAdminSeatRequest(
                data.roomId,
                approverId,
                data.requesterId
            )

            // Update room seats state
            await this.updateRoomSeatsState(data.roomId)

            // Notify the requester
            const requesterSockets = Array.from(this.connectedUsers.entries())
                .filter(([_, userInfo]) => userInfo.userId === data.requesterId)
                .map(([socketId]) => socketId)

            requesterSockets.forEach((socketId) => {
                this.server.to(socketId).emit('adminSeatRequestApproved', {
                    roomId: data.roomId,
                    requestId: data.requestId,
                    seatIndex: -1,
                    message: 'You are now in the admin seat',
                    timestamp: new Date().toISOString()
                })
            })

            // Notify approver
            client.emit('approveAdminSeatResponse', {
                status: 'success',
                message: 'Admin seat transferred successfully'
            })

            // Broadcast to entire room
            this.server.to(`room:${data.roomId}`).emit('seatUpdated', {
                roomId: data.roomId,
                seatIndex: -1,
                occupied: true,
                user: {
                    id: data.requesterId,
                    name: '', // Will be filled by client from participant list
                    avatar: ''
                },
                isAdminSeat: true,
                timestamp: new Date().toISOString()
            })

            this.logger.log(
                `✅ APPROVE_ADMIN_SEAT: Admin seat transferred from ${approverId} to ${data.requesterId} in room ${data.roomId}`
            )

            return { status: 'success', message: result.message }
        } catch (error) {
            this.logger.error(`❌ APPROVE_ADMIN_SEAT failed: ${error.message}`)

            client.emit('approveAdminSeatResponse', {
                status: 'rejected',
                message: error.message
            })

            return { status: 'rejected', message: error.message }
        }
    }

    @SubscribeMessage('acceptParticipant')
    async handleAcceptParticipant(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId: string
            participantId: string
            seatIndex: number
        }
    ) {
        // Support both roomId and roomID for client compatibility
        const roomId = data.roomId

        if (!roomId || !data.participantId) {
            const errorResponse = {
                status: 'rejected',
                user: {
                    id: '',
                    name: '',
                    email: '',
                    sitIndex: '',
                    image: ''
                },
                message: 'Room ID and participant ID are required'
            }
            client.emit('acceptParticipantResponse', errorResponse)
            return errorResponse
        }

        // Get host information
        const hostInfo = await this.getUserInfo(client)
        if (!hostInfo) {
            const errorResponse = {
                status: 'rejected',
                user: {
                    id: '',
                    name: '',
                    email: '',
                    sitIndex: '',
                    image: ''
                },
                message: 'Host information not available'
            }
            client.emit('acceptParticipantResponse', errorResponse)
            return errorResponse
        }

        const { userId: hostId, userName: hostName } = hostInfo

        this.logger.log(
            `✅ ACCEPT_PARTICIPANT request: Host ${hostName} (${hostId}) accepting participant ${data.participantId} in room ${roomId}`
        )

        try {
            // Verify host permissions
            const roomDetails = await this.roomService.getRoomDetails(roomId)
            const hostRoles = await this.roomService.getUserRolesInRoom(
                roomId,
                hostId
            )
            const isHost =
                roomDetails?.hostId === hostId ||
                hostRoles.includes(RoomRole.OWNER)

            if (!isHost) {
                throw new Error('Only room host can accept participants')
            }

            // Get participant information
            const participantInfo = await this.roomService.findUserById(
                data.participantId
            )
            if (!participantInfo) {
                throw new Error('Participant not found')
            }

            // Get the seat index from waiting list if not provided in data
            let seatIndex = data.seatIndex
            if (seatIndex === undefined) {
                // Get seat index from waiting list
                const waitingList =
                    await this.roomService.getRoomWaitingList(roomId)
                const waitingParticipant = waitingList.find(
                    (w) => w.id === data.participantId
                )
                if (waitingParticipant && waitingParticipant.sitIndex) {
                    seatIndex = parseInt(waitingParticipant.sitIndex)
                    this.logger.log(
                        `🔍 ACCEPT_PARTICIPANT: Found participant ${data.participantId} waiting for seat ${seatIndex} in room ${roomId}`
                    )
                }
            }

            // Remove from waiting list
            await this.removeUserFromWaitingList(roomId, data.participantId)

            // If seat index available, try to seat the participant
            if (seatIndex !== undefined) {
                // Ensure seatIndex is a number for comparison
                const seatIndexNumber =
                    typeof seatIndex === 'string'
                        ? parseInt(seatIndex)
                        : seatIndex

                // Check if seat is available
                const currentSeats = await this.roomService.getRoomSeats(roomId)

                this.logger.log(
                    `🔍 ACCEPT_PARTICIPANT: Looking for seat ${seatIndexNumber} (type: ${typeof seatIndexNumber}) in room ${roomId}. Available seats: ${currentSeats.map((s) => `${s.index}(${typeof s.index})`).join(', ')}`
                )

                const targetSeat = currentSeats.find(
                    (seat) => seat.index === seatIndexNumber
                )

                if (!targetSeat) {
                    this.logger.error(
                        `❌ ACCEPT_PARTICIPANT: Seat ${seatIndexNumber} not found in room ${roomId}. Available seats: ${JSON.stringify(currentSeats.map((s) => ({ index: s.index, locked: s.locked, occupied: s.occupied })))}`
                    )
                    throw new Error(
                        `Invalid seat index: ${seatIndexNumber}. Available seats: ${currentSeats.map((s) => s.index).join(', ')}`
                    )
                }

                if (targetSeat.occupied) {
                    this.logger.error(
                        `❌ ACCEPT_PARTICIPANT: Seat ${seatIndexNumber} is already occupied in room ${roomId}`
                    )
                    throw new Error('Seat is already occupied')
                }

                // Unlock the seat before seating the participant
                if (targetSeat.locked) {
                    this.logger.log(
                        `🔓 ACCEPT_PARTICIPANT: Unlocking seat ${seatIndexNumber} for accepted participant ${data.participantId} in room ${roomId}`
                    )

                    const unlockResult = await this.roomService.toggleSeatLock(
                        roomId,
                        seatIndexNumber,
                        false, // isLocked = false (unlock)
                        hostId
                    )

                    if (!unlockResult.success) {
                        throw new Error('Failed to unlock seat for participant')
                    }

                    this.logger.log(
                        `✅ ACCEPT_PARTICIPANT: Successfully unlocked seat ${seatIndexNumber} for participant ${data.participantId}`
                    )
                }

                // Seat the participant
                const participant = await this.roomService.joinRoomWithSeat(
                    roomId,
                    data.participantId,
                    seatIndexNumber
                )

                // Update seat state in memory
                await this.updateRoomSeatsState(roomId)

                // Update seatIndex to the normalized number for subsequent use
                seatIndex = seatIndexNumber
            } else {
                // No seat available - add to room as observer
                this.logger.log(
                    `👁️ ACCEPT_PARTICIPANT: No seat specified for participant ${data.participantId}, adding as observer to room ${roomId}`
                )
                await this.roomService.joinRoom(roomId, data.participantId)
            }

            // Create response in standard format
            const acceptResponse = {
                status: 'accepted',
                user: {
                    id: data.participantId,
                    name: participantInfo.name || 'Unknown',
                    email: participantInfo.email || '',
                    sitIndex: seatIndex?.toString() || '',
                    image: participantInfo.avatarUrl || ''
                },
                seated: seatIndex !== undefined,
                message:
                    seatIndex !== undefined
                        ? `Accepted and seated in seat ${seatIndex}`
                        : 'Accepted as observer'
            }

            // Create joinRoomResponse compatible format
            const joinRoomResponseFormat =
                seatIndex !== undefined
                    ? {
                          userId: data.participantId,
                          name: participantInfo.name || 'Unknown',
                          avatar: participantInfo.avatarUrl || null,
                          seatIndex: seatIndex,
                          isSpeaking: false,
                          micOn: true, // Default to unmuted for newly accepted participants
                          role: 'participant'
                      }
                    : null

            // Emit to host
            client.emit('acceptParticipantResponse', acceptResponse)

            // Notify the accepted participant
            const participantSockets = Array.from(this.connectedUsers.entries())
                .filter(
                    ([_, userInfo]) => userInfo.userId === data.participantId
                )
                .map(([socketId]) => socketId)

            participantSockets.forEach((socketId) => {
                const participantSocket =
                    this.server.sockets.sockets.get(socketId)
                if (participantSocket) {
                    // Send acceptance notification
                    participantSocket.emit(
                        'participantAcceptanceNotification',
                        {
                            status: 'accepted',
                            roomId,
                            seatIndex,
                            seated: seatIndex !== undefined,
                            message:
                                seatIndex !== undefined
                                    ? `You have been accepted and seated in seat ${seatIndex}. You can now join the room.`
                                    : 'You have been accepted as an observer. You can now join the room.',
                            canJoinRoom: true,
                            canSitInSeat: seatIndex !== undefined,
                            acceptedBy: hostName,
                            timestamp: new Date().toISOString()
                        }
                    )

                    // Also send sitInSeatResponse for compatibility
                    if (seatIndex !== undefined) {
                        participantSocket.emit(
                            'sitInSeatResponse',
                            acceptResponse
                        )

                        // ALSO emit joinRoomResponse for Flutter compatibility with consistent format
                        if (joinRoomResponseFormat) {
                            participantSocket.emit(
                                'joinRoomResponse',
                                joinRoomResponseFormat
                            )
                        }

                        this.logger.log(
                            `📤 ACCEPT_PARTICIPANT: Emitted both sitInSeatResponse and joinRoomResponse for participant: ${participantInfo.name}`
                        )
                    }

                    // Auto-join the socket room so they can receive real-time updates
                    participantSocket.join(`room:${roomId}`)

                    this.logger.log(
                        `📤 ACCEPT_PARTICIPANT: Notified participant ${data.participantId} via socket ${socketId}`
                    )
                }
            })

            // Broadcast to room
            this.server.to(`room:${roomId}`).emit('participantAccepted', {
                roomId,
                participantId: data.participantId,
                participantName: participantInfo.name,
                seatIndex,
                acceptedBy: hostId,
                acceptedByName: hostName,
                timestamp: new Date().toISOString()
            })

            // Broadcast updated seat state to all participants
            if (seatIndex !== undefined) {
                const updatedSeats = this.roomSeats.get(roomId) || []
                this.server.to(`room:${roomId}`).emit('seatUpdated', {
                    roomId,
                    seats: updatedSeats,
                    action: 'participant_accepted_and_seated',
                    seatIndex,
                    participantId: data.participantId,
                    participantName: participantInfo.name
                })

                this.logger.log(
                    `📤 ACCEPT_PARTICIPANT: Broadcasted seat update for seat ${seatIndex} in room ${roomId}`
                )
            }

            this.logger.log(
                `✅ ACCEPT_PARTICIPANT success: Participant ${participantInfo.name} (${data.participantId}) accepted by host ${hostName} (${hostId}) in room ${roomId}${seatIndex !== undefined ? ` and seated in seat ${seatIndex}` : ''}`
            )

            return acceptResponse
        } catch (error) {
            this.logger.error(
                `❌ ACCEPT_PARTICIPANT failed: Host ${hostName} (${hostId}) failed to accept participant ${data.participantId} in room ${roomId} | Error: ${error.message}`,
                error.stack
            )

            const errorResponse = {
                status: 'rejected',
                user: {
                    id: data.participantId || '',
                    name: '',
                    email: '',
                    sitIndex: data.seatIndex?.toString() || '',
                    image: ''
                },
                message: error.message
            }

            client.emit('acceptParticipantResponse', errorResponse)
            return errorResponse
        }
    }

    @SubscribeMessage('rejectParticipant')
    async handleRejectParticipant(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId?: string
            participantId: string
            reason?: string
        }
    ) {
        // Support both roomId and roomID for client compatibility
        const roomId = data.roomId

        if (!roomId || !data.participantId) {
            const errorResponse = {
                status: 'rejected',
                user: {
                    id: '',
                    name: '',
                    email: '',
                    sitIndex: '',
                    image: ''
                },
                message: 'Room ID and participant ID are required'
            }
            client.emit('rejectParticipantResponse', errorResponse)
            return errorResponse
        }

        // Get host information
        const hostInfo = await this.getUserInfo(client)
        if (!hostInfo) {
            const errorResponse = {
                status: 'rejected',
                user: {
                    id: '',
                    name: '',
                    email: '',
                    sitIndex: '',
                    image: ''
                },
                message: 'Host information not available'
            }
            client.emit('rejectParticipantResponse', errorResponse)
            return errorResponse
        }

        const { userId: hostId, userName: hostName } = hostInfo

        this.logger.log(
            `❌ REJECT_PARTICIPANT request: Host ${hostName} (${hostId}) rejecting participant ${data.participantId} in room ${roomId}`
        )

        try {
            // Verify host permissions
            const roomDetails = await this.roomService.getRoomDetails(roomId)
            const hostRoles = await this.roomService.getUserRolesInRoom(
                roomId,
                hostId
            )
            const isHost =
                roomDetails?.hostId === hostId ||
                hostRoles.includes(RoomRole.OWNER)

            if (!isHost) {
                throw new Error('Only room host can reject participants')
            }

            // Get participant information
            const participantInfo = await this.roomService.findUserById(
                data.participantId
            )
            if (!participantInfo) {
                throw new Error('Participant not found')
            }

            // Remove from waiting list
            await this.removeUserFromWaitingList(roomId, data.participantId)

            // Create response
            const rejectResponse = {
                status: 'rejected',
                user: {
                    id: data.participantId,
                    name: participantInfo.name || 'Unknown',
                    email: participantInfo.email || '',
                    sitIndex: '',
                    image: participantInfo.avatarUrl || ''
                },
                reason: data.reason || 'Rejected by host'
            }

            // Emit to host
            client.emit('rejectParticipantResponse', rejectResponse)

            // Notify the rejected participant
            const participantSockets = Array.from(this.connectedUsers.entries())
                .filter(
                    ([_, userInfo]) => userInfo.userId === data.participantId
                )
                .map(([socketId]) => socketId)

            participantSockets.forEach((socketId) => {
                const participantSocket =
                    this.server.sockets.sockets.get(socketId)
                if (participantSocket) {
                    participantSocket.emit('sitInSeatResponse', rejectResponse)
                }
            })

            // Broadcast to room
            this.server.to(`room:${roomId}`).emit('participantRejected', {
                roomId,
                participantId: data.participantId,
                participantName: participantInfo.name,
                rejectedBy: hostId,
                rejectedByName: hostName,
                reason: data.reason || 'Rejected by host',
                timestamp: new Date().toISOString()
            })

            this.logger.log(
                `❌ REJECT_PARTICIPANT success: Participant ${participantInfo.name} (${data.participantId}) rejected by host ${hostName} (${hostId}) in room ${roomId}`
            )

            return rejectResponse
        } catch (error) {
            this.logger.error(
                `❌ REJECT_PARTICIPANT failed: Host ${hostName} (${hostId}) failed to reject participant ${data.participantId} in room ${roomId} | Error: ${error.message}`,
                error.stack
            )

            const errorResponse = {
                status: 'rejected',
                user: {
                    id: data.participantId || '',
                    name: '',
                    email: '',
                    sitIndex: '',
                    image: ''
                },
                message: error.message
            }

            client.emit('rejectParticipantResponse', errorResponse)
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
        @MessageBody()
        data: {
            room: string // Room ID
            content: string // Message content
            sender: string // User ID of sender
            messageType?: string // Optional message type (default: 'text')
            replyToId?: string // Optional reply to comment ID
            metadata?: any // Optional metadata
        }
    ) {
        const requestId = Math.random().toString(36).substr(2, 9) // Generate unique request ID
        const userInfo = this.connectedUsers.get(client.id)
        const userId = data.sender || userInfo?.userId // Use sender from data as fallback
        const userName = userInfo?.userName || 'Unknown User'

        this.logger.log(
            `💬 SEND_COMMENT request [${requestId}]: User ${userName} (${userId}) sending comment to room ${data.room} | ` +
                `Client: ${client.id} | Type: ${data.messageType || 'text'} | Length: ${data.content?.length || 0} chars` +
                (data.replyToId ? ` | Reply to: ${data.replyToId}` : '')
        )

        try {
            // Validate new message format
            if (!data.room) {
                throw new Error('Room ID (room) is required')
            }
            if (!data.content) {
                throw new Error('Content is required')
            }
            if (!data.sender) {
                throw new Error('Sender ID is required')
            }

            // Verify user is actually in the room (socket room membership)
            const roomName = `room:${data.room}`
            const isInSocketRoom = client.rooms.has(roomName)

            if (!isInSocketRoom) {
                throw new Error(
                    'You must join the room first before commenting'
                )
            }

            // Verify participant status in database
            const participants = await this.roomService.getRoomParticipants(
                data.room
            )
            const isParticipant = participants.some((p) => p.userId === userId)

            this.logger.log(
                `🔍 SEND_COMMENT [${requestId}]: Participant check - User ${userId} | IsParticipant: ${isParticipant} | Total participants: ${participants.length}`
            )

            // Allow both participants and observers to send comments
            // Only require being in the socket room
            if (!isParticipant) {
                this.logger.warn(
                    `⚠️ SEND_COMMENT [${requestId}]: User ${userName} (${userId}) is not a participant but allowing as observer in room ${data.room}`
                )
                // Don't throw error - allow observers to comment
                // throw new Error('You are not a participant in this room')
            }

            // Add the comment via service - allow observers to comment
            const comment = await this.roomService.addRoomComment(
                data.room,
                userId,
                data.content,
                (data.messageType as any) || 'text',
                data.replyToId,
                data.metadata,
                true // allowObservers = true
            )

            // Create the response object
            const commentResponse = {
                _id: comment.uuid,
                content: comment.message,
                senderId: comment.userId,
                createdAt: comment.createdAt.toISOString(),
                senderImage: comment.user?.avatarUrl || '',
                senderName:
                    comment.user?.name || comment.user?.email || userName
            }

            this.logger.log(
                `📤 SEND_COMMENT [${requestId}]: About to emit sendCommentResponse for comment ${comment.uuid} to client ${client.id}`
            )

            // Check if we've already sent this comment response to this client
            const commentKey = comment.uuid
            if (!this.sentCommentResponses.has(commentKey)) {
                this.sentCommentResponses.set(commentKey, new Set())
            }

            const clientsForComment = this.sentCommentResponses.get(commentKey)
            if (clientsForComment.has(client.id)) {
                this.logger.warn(
                    `⚠️ SEND_COMMENT [${requestId}]: Duplicate emission prevented for comment ${comment.uuid} to client ${client.id}`
                )
                return {
                    status: 'success',
                    comment,
                    message: 'Duplicate emission prevented'
                }
            }

            // Mark this client as having received this comment response
            clientsForComment.add(client.id)

            // Emit direct response to the sender ONLY ONCE
            client.emit('sendCommentResponse', commentResponse)

            this.logger.log(
                `✅ SEND_COMMENT [${requestId}]: Successfully emitted sendCommentResponse for comment ${comment.uuid} to client ${client.id}`
            )

            // Clean up old comment tracking (optional: prevent memory leaks)
            // Keep only the last 1000 comments in memory
            if (this.sentCommentResponses.size > 1000) {
                const firstKey = this.sentCommentResponses.keys().next().value
                this.sentCommentResponses.delete(firstKey)
            }

            // Emit to all room participants
            // this.server
            //     .to(roomName)
            //     .emit('sendCommentResponse', commentResponse)

            // Emit activity update
            // this.server.to(roomName).emit('commentActivityUpdate', {
            //     action: 'comment_added',
            //     roomId: data.room,
            //     commentId: comment.uuid,
            //     addedBy: userId,
            //     addedByName: userName,
            //     timestamp: new Date().toISOString()
            // })

            // Track user activity
            this.trackUserActivity(userId, 'sendComment')

            this.logger.log(
                `✅ SEND_COMMENT [${requestId}] success: User ${userName} (${userId}) sent comment to room ${data.room} | Response emitted`
            )

            return {
                status: 'success',
                comment
            }
        } catch (error) {
            this.logger.error(
                `❌ SEND_COMMENT [${requestId}] failed: User ${userName} (${userId}) failed to send comment to room ${data.room} | ` +
                    `Error: ${error.message}`,
                error.stack
            )

            // Emit direct error response to the sender
            client.emit('sendCommentResponse', {
                _id: null,
                content: error.message,
                senderId: userId,
                createdAt: new Date().toISOString(),
                senderImage: '',
                senderName: userName
            })

            return {
                status: 'error',
                message: error.message,
                roomId: data.room
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
            senderId: string
            giftId: string
            receiverId: string[]
            quantity: number
            message?: string
            roomId?: string
        }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = data.senderId || userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        // Validate senderId is provided
        if (!data.senderId) {
            this.logger.error(`❌ SEND_GIFT: senderId is required in payload`)
            return { status: 'error', message: 'senderId is required' }
        }

        this.logger.log(
            `🎁 SEND_GIFT: User ${userName} (${userId}) sending gift ${data.giftId} (qty: ${data.quantity}) to ${data.receiverId.length} recipients in room ${data.roomId}`
        )

        try {
            // Ensure user is in the socket room before sending gift
            if (data.roomId) {
                client.join(`room:${data.roomId}`)
                this.logger.log(
                    `🏠 SEND_GIFT: Ensured user ${userName} (${userId}) is in socket room: room:${data.roomId}`
                )
            }

            // Use allowNonParticipants = true to allow observers to send gifts
            const result = await this.giftService.sendGift(
                userId,
                data.receiverId,
                data.giftId,
                data.quantity,
                data.roomId,
                data.message,
                true // Allow non-participants (observers) to send gifts
            )

            // Fetch receiver details for enhanced response
            const receiverDetails = []
            for (const receiverId of data.receiverId) {
                try {
                    const receiver = await this.userRepository.findOne({
                        where: { uuid: receiverId },
                        select: ['uuid', 'name', 'avatarUrl']
                    })
                    receiverDetails.push({
                        uuid: receiverId,
                        name: receiver?.name || 'Unknown User',
                        avatarUrl: receiver?.avatarUrl || null
                    })
                } catch (error) {
                    // If user not found, still include basic info
                    receiverDetails.push({
                        uuid: receiverId,
                        name: 'Unknown User',
                        avatarUrl: null
                    })
                }
            }

            // Emit to sender
            client.emit('giftSent', {
                success: true,
                data: result,
                roomId: data.roomId
            })

            // Emit to each receiver
            for (const receiverId of data.receiverId) {
                this.server.to(`user:${receiverId}`).emit('giftReceived', {
                    data: result,
                    roomId: data.roomId,
                    receiverId
                })
            }

            // Emit to all room participants with enhanced logging
            if (data.roomId) {
                const roomGiftData = {
                    roomId: data.roomId,
                    data: result,
                    sender: {
                        id: userId,
                        name: userName,
                        avatarUrl: userInfo?.avatarUrl || null
                    },
                    receivers: receiverDetails, // Now contains detailed receiver info
                    timestamp: new Date().toISOString()
                }

                this.logger.log(
                    `📡 SEND_GIFT: Emitting roomGiftSent to room:${data.roomId} with data:`,
                    JSON.stringify(roomGiftData, null, 2)
                )

                this.server
                    .to(`room:${data.roomId}`)
                    .emit('roomGiftSent', roomGiftData)

                // Log room information for debugging
                const roomSockets = await this.server
                    .in(`room:${data.roomId}`)
                    .fetchSockets()
                this.logger.log(
                    `📊 SEND_GIFT: Room ${data.roomId} has ${roomSockets.length} connected sockets`
                )

                roomSockets.forEach((socket, index) => {
                    const socketUserInfo = this.connectedUsers.get(socket.id)
                    this.logger.log(
                        `📊 Socket ${index + 1}: ${socket.id} - User: ${socketUserInfo?.userName} (${socketUserInfo?.userId})`
                    )
                })
            }

            // Emit gift activity update
            this.server
                .to(`room:${data.roomId || 'global'}`)
                .emit('giftActivityUpdate', {
                    action: 'gift_sent',
                    roomId: data.roomId,
                    senderId: userId,
                    senderName: userName,
                    receiverIds: data.receiverId, // Keep original IDs for backward compatibility
                    receivers: receiverDetails, // Add detailed receiver info
                    giftId: data.giftId,
                    quantity: data.quantity,
                    summary: result.summary,
                    timestamp: new Date().toISOString()
                })

            this.logger.log(
                `✅ SEND_GIFT success: User ${userName} (${userId}) sent gift ${data.giftId} (qty: ${data.quantity}) to ${data.receiverId.length} recipients`
            )

            return { status: 'success', data: result }
        } catch (error) {
            this.logger.error(
                `❌ SEND_GIFT failed: User ${userName} (${userId}) failed to send gift ${data.giftId} to recipients | Error: ${error.message}`,
                error.stack
            )

            // Emit specific error events based on error type
            if (
                error.message.includes('must be in the room') ||
                error.message.includes('not seated')
            ) {
                client.emit('giftError', {
                    type: 'not_in_room',
                    message:
                        'You must be seated in the room to send gifts to participants',
                    roomId: data.roomId,
                    senderId: userId
                })
            } else if (error.message.includes('Insufficient diamond balance')) {
                client.emit('giftError', {
                    type: 'insufficient_balance',
                    message: error.message,
                    roomId: data.roomId,
                    senderId: userId
                })
            } else {
                client.emit('giftError', {
                    type: 'general_error',
                    message: error.message,
                    roomId: data.roomId,
                    senderId: userId
                })
            }

            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('getRoomComments')
    async handleGetRoomComments(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId?: string
            roomID?: string // Support both field names for client compatibility
            userId: string
            limit?: number
            offset?: number
            lastCommentId?: string
        }
    ) {
        const requestId = Math.random().toString(36).substr(2, 9) // Generate unique request ID

        // Add console log for immediate debugging
        console.log('🔥 GET_ROOM_COMMENTS: Handler called!', {
            socketId: client.id,
            requestId: requestId,
            data: JSON.stringify(data)
        })

        const userInfo = this.connectedUsers.get(client.id)
        const userId = data.userId || userInfo?.userId
        const userName = userInfo?.userName || 'Unknown User'

        // Support both roomId and roomID for client compatibility
        const roomId = data.roomId || data.roomID

        this.logger.log(
            `📄 GET_ROOM_COMMENTS [${requestId}]: Processing request from ${userName} (${userId}) for room ${roomId}`
        )
        this.logger.debug(
            `📄 GET_ROOM_COMMENTS [${requestId}]: Raw data: ${JSON.stringify(data)}`
        )

        // Helper function to emit getRoomCommentsResponse with duplicate prevention
        const emitGetCommentsResponse = (
            response: any,
            responseType: string
        ) => {
            const requestKey = `${requestId}-${client.id}-${roomId}-${userId}`

            // Check for duplicate emissions
            if (!this.sentGetCommentsResponses.has(requestKey)) {
                this.sentGetCommentsResponses.set(requestKey, new Set())
            }

            const clientsForRequest =
                this.sentGetCommentsResponses.get(requestKey)
            if (clientsForRequest.has(client.id)) {
                this.logger.warn(
                    `⚠️ GET_ROOM_COMMENTS [${requestId}]: Duplicate emission prevented for ${responseType} to client ${client.id}`
                )
                return false
            }

            // Mark this client as having received this response
            clientsForRequest.add(client.id)

            this.logger.log(
                `📤 GET_ROOM_COMMENTS [${requestId}]: About to emit getRoomCommentsResponse (${responseType}) to client ${client.id} | Status: ${response.status}`
            )

            client.emit('getRoomCommentsResponse', response)

            this.logger.log(
                `✅ GET_ROOM_COMMENTS [${requestId}]: Successfully emitted getRoomCommentsResponse (${responseType}) to client ${client.id} | Data count: ${response.data ? response.data.length : 'N/A'}`
            )

            // Clean up old request tracking (prevent memory leaks)
            if (this.sentGetCommentsResponses.size > 500) {
                const firstKey = this.sentGetCommentsResponses
                    .keys()
                    .next().value
                this.sentGetCommentsResponses.delete(firstKey)
            }

            return true
        }

        if (!roomId) {
            this.logger.warn(
                `⚠️ GET_ROOM_COMMENTS [${requestId}] denied: No roomId provided by user ${userName} (${userId})`
            )

            const errorResponse = {
                status: 'error',
                message: 'Room ID is required'
            }

            emitGetCommentsResponse(errorResponse, 'ROOM_ID_ERROR')
            return errorResponse
        }

        if (!userId) {
            this.logger.warn(
                `⚠️ GET_ROOM_COMMENTS [${requestId}] denied: No userId provided for room ${roomId}`
            )

            const errorResponse = {
                status: 'error',
                message: 'User ID is required'
            }

            emitGetCommentsResponse(errorResponse, 'USER_ID_ERROR')
            return errorResponse
        }

        this.logger.log(
            `📄 GET_ROOM_COMMENTS [${requestId}]: User ${userName} (${userId}) requesting comments for room ${roomId} | ` +
                `Limit: ${data.limit || 'default'} | Offset: ${data.offset || 0}` +
                (data.lastCommentId
                    ? ` | LastCommentId: ${data.lastCommentId}`
                    : '')
        )

        try {
            // Verify user is in the room
            const roomName = `room:${roomId}`
            const isInSocketRoom = client.rooms.has(roomName)

            this.logger.log(
                `🔍 GET_ROOM_COMMENTS [${requestId}]: Checking room membership for ${userName} (${userId}) in ${roomName} | InRoom: ${isInSocketRoom}`
            )

            if (!isInSocketRoom) {
                this.logger.warn(
                    `⚠️ GET_ROOM_COMMENTS [${requestId}] denied: User ${userName} (${userId}) is not in socket room ${roomId}`
                )
                throw new Error('You must join the room first to view comments')
            }

            // Check if user has access to the room (either as participant or observer)
            // Allow both participants and observers to view comments
            const participants =
                await this.roomService.getRoomParticipants(roomId)
            const isParticipant = participants.some((p) => p.userId === userId)

            this.logger.log(
                `🔍 GET_ROOM_COMMENTS [${requestId}]: User access check for ${userName} (${userId}) | IsParticipant: ${isParticipant}`
            )

            // Note: Removed the strict participant requirement to allow observers to view comments
            // if (!isParticipant) {
            //     this.logger.warn(
            //         `⚠️ GET_ROOM_COMMENTS denied: User ${userName} (${userId}) is not a participant in room ${roomId}`
            //     )
            //     throw new Error('You must be a participant to view comments')
            // }

            this.logger.log(
                `📊 GET_ROOM_COMMENTS [${requestId}]: Fetching comments from database for room ${roomId}`
            )

            const result = await this.roomService.getRoomComments(roomId)

            this.logger.log(
                `📊 GET_ROOM_COMMENTS [${requestId}]: Retrieved ${result.length} comments from database for room ${roomId}`
            )

            // Apply pagination if requested
            let paginatedComments = result
            if (data.limit || data.offset) {
                const limit = data.limit || 50
                const offset = data.offset || 0
                paginatedComments = result.slice(offset, offset + limit)
            }

            this.logger.log(
                `✅ GET_ROOM_COMMENTS [${requestId}] success: User ${userName} (${userId}) retrieved ${paginatedComments.length}/${result.length} comments for room ${roomId}`
            )

            const successResponse = {
                status: 'success',
                data: paginatedComments,
                count: paginatedComments.length,
                totalCount: result.length,
                hasMore: data.limit
                    ? (data.offset || 0) + (data.limit || 50) < result.length
                    : false,
                roomId: roomId
            }

            emitGetCommentsResponse(successResponse, 'SUCCESS')
            return successResponse
        } catch (error) {
            this.logger.error(
                `❌ GET_ROOM_COMMENTS [${requestId}] failed: User ${userName} (${userId}) failed to get comments for room ${roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )

            const errorResponse = {
                status: 'error',
                message: error.message,
                roomId: roomId
            }

            emitGetCommentsResponse(errorResponse, 'CATCH_ERROR')
            return errorResponse
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
        // Get validated user information
        const validatedUser = await this.getUserInfo(client)

        if (!validatedUser) {
            const errorResponse = {
                status: 'error',
                message: 'User information not available for kick operation',
                roomId: data.roomId
            }
            client.emit('kickUserResponse', errorResponse)
            return errorResponse
        }

        const { userId, userName } = validatedUser

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

    @SubscribeMessage('blockUser')
    async handleBlockUser(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId: string
            blockUserID: string
            reason?: string
        }
    ) {
        const requestId = Math.random().toString(36).substr(2, 9) // Generate unique request ID

        this.logger.log(
            `🚫 BLOCK_USER request [${requestId}]: Client ${client.id} wants to block user ${data.blockUserID} from room ${data.roomId}`
        )

        // Helper function to emit blockUserResponse with duplicate prevention
        const emitBlockUserResponse = (response: any, responseType: string) => {
            const requestKey = `${requestId}-${client.id}-${data.roomId}-${data.blockUserID}`

            // Check for duplicate emissions
            if (!this.sentBlockUserResponses.has(requestKey)) {
                this.sentBlockUserResponses.set(requestKey, new Set())
            }

            const clientsForRequest =
                this.sentBlockUserResponses.get(requestKey)
            if (clientsForRequest.has(client.id)) {
                this.logger.warn(
                    `⚠️ BLOCK_USER [${requestId}]: Duplicate emission prevented for ${responseType} to client ${client.id}`
                )
                return false
            }

            // Mark this client as having received this response
            clientsForRequest.add(client.id)

            this.logger.log(
                `📤 BLOCK_USER [${requestId}]: About to emit blockUserResponse (${responseType}) to client ${client.id} | Status: ${response.status}`
            )

            // client.emit('blockUserResponse', response)

            this.logger.log(
                `✅ BLOCK_USER [${requestId}]: Successfully emitted blockUserResponse (${responseType}) to client ${client.id} | Response: ${JSON.stringify(response)}`
            )

            // Clean up old request tracking (prevent memory leaks)
            if (this.sentBlockUserResponses.size > 500) {
                const firstKey = this.sentBlockUserResponses.keys().next().value
                this.sentBlockUserResponses.delete(firstKey)
            }

            return true
        }

        if (!data.roomId) {
            const errorResponse = {
                status: 'error',
                message: 'Room ID is required',
                roomId: '',
                blockUserID: data.blockUserID || ''
            }

            emitBlockUserResponse(errorResponse, 'ROOM_ID_ERROR')
            return errorResponse
        }

        if (!data.blockUserID) {
            const errorResponse = {
                status: 'error',
                message: 'Block user ID is required',
                roomId: data.roomId,
                blockUserID: ''
            }

            emitBlockUserResponse(errorResponse, 'BLOCK_USER_ID_ERROR')
            return errorResponse
        }

        // Get validated user information (the one doing the blocking)
        const validatedUser = await this.getUserInfo(client)

        if (!validatedUser) {
            const errorResponse = {
                status: 'error',
                message: 'User information not available for block operation',
                roomId: data.roomId,
                blockUserID: data.blockUserID
            }

            emitBlockUserResponse(errorResponse, 'USER_VALIDATION_ERROR')
            return errorResponse
        }

        const { userId: blockerUserId, userName: blockerUserName } =
            validatedUser

        this.logger.log(
            `🚫 BLOCK_USER [${requestId}]: User ${blockerUserName} (${blockerUserId}) attempting to block user ${data.blockUserID} from room ${data.roomId}`
        )

        try {
            // Call the room service to block the user
            const result = await this.roomService.blockUserFromRoom(
                data.roomId,
                data.blockUserID,
                blockerUserId,
                data.reason
            )

            if (!result.success) {
                const errorResponse = {
                    status: 'error',
                    message: result.message,
                    roomId: data.roomId,
                    blockUserID: data.blockUserID
                }

                emitBlockUserResponse(errorResponse, 'SERVICE_ERROR')
                return errorResponse
            }

            // Find the blocked user's socket to disconnect them from this specific room
            const blockedUserSocket = Array.from(
                this.connectedUsers.entries()
            ).find(([socketId, user]) => user.userId === data.blockUserID)

            if (blockedUserSocket) {
                const [blockedSocketId] = blockedUserSocket
                const blockedSocket =
                    this.server.sockets.sockets.get(blockedSocketId)

                if (blockedSocket) {
                    // Remove from this specific socket room
                    blockedSocket.leave(`room:${data.roomId}`)
                    this.logger.log(
                        `🚪 BLOCK_USER [${requestId}]: Removed blocked user ${data.blockUserID} from socket room: room:${data.roomId}`
                    )

                    // Update user's room tracking - remove only this specific room
                    const blockedUserInfo =
                        this.connectedUsers.get(blockedSocketId)
                    if (blockedUserInfo) {
                        blockedUserInfo.rooms.delete(data.roomId)
                        this.logger.log(
                            `📝 BLOCK_USER [${requestId}]: Updated blocked user tracking - now in rooms: [${Array.from(blockedUserInfo.rooms).join(', ')}]`
                        )
                    }

                    // Notify the blocked user specifically
                    blockedSocket.emit('userBlocked', {
                        roomId: data.roomId,
                        reason: data.reason || 'No reason provided',
                        blockedBy: {
                            userId: blockerUserId,
                            userName: blockerUserName
                        },
                        timestamp: new Date().toISOString()
                    })
                }
            }

            // Update room user count
            const currentCount = this.roomUserCounts.get(data.roomId) || 0
            const newCount = Math.max(0, currentCount - 1)
            this.roomUserCounts.set(data.roomId, newCount)

            // Notify all room participants about the block
            this.server.to(`room:${data.roomId}`).emit('blockUserResponse', {
                roomId: data.roomId,
                blockedUserId: data.blockUserID,
                reason: data.reason || 'No reason provided',
                blockedBy: {
                    userId: blockerUserId,
                    userName: blockerUserName
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

            this.logger.log(
                `✅ BLOCK_USER [${requestId}] success: User ${blockerUserName} (${blockerUserId}) blocked user ${data.blockUserID} from room ${data.roomId}`
            )

            // Track user activity
            this.trackUserActivity(blockerUserId, 'seatActions')

            const successResponse = {
                status: 'success',
                message: result.message,
                roomId: data.roomId,
                blockUserID: data.blockUserID,
                blockedBy: {
                    userId: blockerUserId,
                    userName: blockerUserName
                },
                roomUserCount: newCount,
                timestamp: new Date().toISOString()
            }

            emitBlockUserResponse(successResponse, 'SUCCESS')
            return successResponse
        } catch (error) {
            this.logger.error(
                `❌ BLOCK_USER [${requestId}] failed: User ${blockerUserName} (${blockerUserId}) failed to block user ${data.blockUserID} from room ${data.roomId} | ` +
                    `Error: ${error.message}`,
                error.stack
            )

            const errorResponse = {
                status: 'error',
                message: error.message,
                roomId: data.roomId,
                blockUserID: data.blockUserID
            }

            emitBlockUserResponse(errorResponse, 'CATCH_ERROR')
            return errorResponse
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
        @MessageBody()
        data: { userId: string; roomId: string; seatIndex?: number }
    ) {
        const userInfo = this.connectedUsers.get(client.id)
        const userId = data?.userId || userInfo?.userId
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
            roomId: string
            seatIndex: number
            isLocked: boolean
        }
    ) {
        // Get validated user information
        const validatedUser = await this.getUserInfo(client)

        if (!validatedUser) {
            const errorResponse = {
                success: false,
                status: 'error',
                message:
                    'User information not available for seat lock operation',
                roomId: data.roomId,
                seatIndex: data.seatIndex,
                isLocked: false,
                action: 'error',
                timestamp: new Date().toISOString()
            }

            client.emit('toggleSeatLockResponse', errorResponse)
            return errorResponse
        }

        const { userId, userName } = validatedUser

        this.logger.log(
            `🔒 TOGGLE_SEAT_LOCK: User ${userName} (${userId}) ${
                data.isLocked ? 'locking' : 'unlocking'
            } seat ${data.seatIndex} in room ${data.roomId}`
        )

        try {
            if (!data.roomId || data.seatIndex === undefined) {
                throw new Error('Room ID and seat index are required')
            }

            // Verify user is in the room
            const roomName = `room:${data.roomId}`
            const isInSocketRoom = client.rooms.has(roomName)

            if (!isInSocketRoom) {
                throw new Error('You must be in the room to toggle seat locks')
            }

            // Call the room service to toggle seat lock
            const result = await this.roomService.toggleSeatLock(
                data.roomId,
                data.seatIndex,
                data.isLocked,
                userId
            )

            if (!result.success) {
                throw new Error('Failed to toggle seat lock')
            }

            // Update seat state in memory
            await this.updateRoomSeatsState(data.roomId)

            // Get updated seats for response
            const updatedSeats = await this.roomService.getRoomSeats(
                data.roomId
            )

            this.logger.log(
                `✅ TOGGLE_SEAT_LOCK success: Seat ${data.seatIndex} ${
                    data.isLocked ? 'locked' : 'unlocked'
                } in room ${data.roomId} by ${userName} (${userId})`
            )

            // Emit comprehensive response with all necessary data
            const successResponse = {
                success: true,
                status: 'success',
                roomId: data.roomId,
                seatIndex: data.seatIndex,
                isLocked: data.isLocked,
                message: `Seat ${data.seatIndex} ${data.isLocked ? 'locked' : 'unlocked'} successfully`,
                seats: updatedSeats,
                lockedBy: {
                    userId: userId,
                    userName: userName
                },
                action: data.isLocked ? 'locked' : 'unlocked',
                timestamp: new Date().toISOString()
            }

            // Emit response to the requester
            client.emit('toggleSeatLockResponse', successResponse)

            // Broadcast seat lock update to all room participants for real-time sync
            const roomSocketName = `room:${data.roomId}`
            this.server.to(roomSocketName).emit('seatLockUpdated', {
                roomId: data.roomId,
                seatIndex: data.seatIndex,
                isLocked: data.isLocked,
                lockedBy: {
                    userId: userId,
                    userName: userName
                },
                seats: updatedSeats,
                timestamp: new Date().toISOString()
            })

            // Also emit updated room state to all participants
            this.server.to(roomSocketName).emit('roomSeatsUpdated', {
                roomId: data.roomId,
                seats: updatedSeats,
                action: 'seat_lock_toggled',
                seatIndex: data.seatIndex,
                isLocked: data.isLocked,
                timestamp: new Date().toISOString()
            })

            // Track user activity
            this.trackUserActivity(userId, 'seatActions')

            return successResponse
        } catch (error) {
            this.logger.error(
                `❌ TOGGLE_SEAT_LOCK failed: User ${userName} (${userId}) failed to toggle seat lock | ` +
                    `RoomId: ${data.roomId}, SeatIndex: ${data.seatIndex}, isLocked: ${data.isLocked} | ` +
                    `Error: ${error.message}`,
                error.stack
            )

            // Emit comprehensive error response to the requester
            const errorResponse = {
                success: false,
                status: 'error',
                message: error.message,
                roomId: data.roomId,
                seatIndex: data.seatIndex,
                isLocked: false, // Reset to false on error
                action: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            }

            client.emit('toggleSeatLockResponse', errorResponse)
            return errorResponse
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
                        nextUser.id,
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
                            userId: nextUser.id,
                            userName: nextUser.name || 'Unknown User',
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
                        userId: nextUser.id,
                        userName: nextUser.name || 'Unknown User',
                        seatIndex: availableSeat.index,
                        userRole: 'participant',
                        seats: updatedSeats,
                        timestamp: new Date().toISOString()
                    })

                    this.logger.log(
                        `✅ Promoted user ${nextUser.id} from waiting list to seat ${availableSeat.index} in room ${roomId}`
                    )
                } catch (error) {
                    this.logger.error(
                        `❌ Failed to promote user ${nextUser.id} from waiting list in room ${roomId}: ${error.message}`
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
     * Remove a specific user from the waiting list
     */
    private async removeUserFromWaitingList(
        roomId: string,
        userId: string
    ): Promise<void> {
        try {
            // Use the waiting list repository directly since there's no service method
            const waitingListRepository =
                this.roomService['waitingListRepository']

            // Find and remove the waiting list entry
            const waitingEntry = await waitingListRepository
                .createQueryBuilder('waitingList')
                .where('waitingList.roomId = :roomId', {
                    roomId: String(roomId)
                })
                .andWhere('waitingList.userId = :userId', {
                    userId: String(userId)
                })
                .getOne()

            if (waitingEntry) {
                await waitingListRepository.remove(waitingEntry)
                this.logger.log(
                    `✅ Removed user ${userId} from waiting list in room ${roomId}`
                )
            } else {
                this.logger.log(
                    `⚠️ User ${userId} not found in waiting list for room ${roomId}`
                )
            }
        } catch (error) {
            this.logger.error(
                `❌ Failed to remove user ${userId} from waiting list in room ${roomId}: ${error.message}`
            )
            throw error
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

    // ==================== PK BATTLE WEBSOCKET EVENTS ====================

    @SubscribeMessage('createPKBattle')
    async handleCreatePKBattle(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId: string
            participantIds: string[]
            durationMinutes: number
            battleType?: string
            description?: string
        }
    ) {
        try {
            const userId = (client as any).userId
            const userName = (client as any).userName

            this.logger.log(
                `📤 CREATE_PK_BATTLE request: User ${userName} (${userId}) creating battle in room ${data.roomId}`
            )

            // Validate user is connected
            if (!userId) {
                client.emit('createPKBattleResponse', {
                    status: 'error',
                    message: 'User not authenticated'
                })
                return
            }

            const battle = await this.roomService.createPKBattle(
                data.roomId,
                userId,
                data.participantIds,
                data.durationMinutes,
                (data.battleType as any) || 'host_selected',
                data.description
            )

            // Emit to all users in the room
            this.server.to(`room_${data.roomId}`).emit('pkBattleCreated', {
                battleId: battle.uuid,
                roomId: data.roomId,
                hostId: userId,
                hostName: userName,
                status: battle.status,
                duration: battle.duration,
                battleType: battle.battleType,
                startTime: battle.startTime,
                endTime: battle.endTime,
                participants:
                    battle.participants?.map((p) => ({
                        userId: p.userId,
                        name: p.user?.name,
                        position: p.position,
                        status: p.status,
                        joinedAt: p.joinedAt
                    })) || [],
                createdAt: battle.createdAt,
                isAutoStarted:
                    battle.battleType === 'host_selected' &&
                    battle.status === 'active'
            })

            // If battle is HOST_SELECTED and started immediately, emit additional battle started event
            if (
                battle.battleType === 'host_selected' &&
                battle.status === 'active'
            ) {
                this.server.to(`room_${data.roomId}`).emit('pkBattleStarted', {
                    battleId: battle.uuid,
                    roomId: data.roomId,
                    startTime: battle.startTime,
                    endTime: battle.endTime,
                    status: 'active',
                    participants:
                        battle.participants?.map((p) => ({
                            userId: p.userId,
                            name: p.user?.name,
                            position: p.position,
                            status: p.status,
                            totalGifts: 0,
                            giftValue: 0
                        })) || [],
                    message: 'PK Battle started automatically (Host Selected)'
                })
            }

            // Send success response to creator
            client.emit('createPKBattleResponse', {
                status: 'success',
                message: 'PK Battle created successfully',
                battleId: battle.uuid
            })

            this.logger.log(
                `✅ CREATE_PK_BATTLE success: Battle ${battle.uuid} created by ${userName} (${userId})`
            )
        } catch (error) {
            this.logger.error(`❌ CREATE_PK_BATTLE failed: ${error.message}`)

            client.emit('createPKBattleResponse', {
                status: 'error',
                message: error.message
            })
        }
    }

    @SubscribeMessage('respondToPKBattle')
    async handleRespondToPKBattle(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            battleId: string
            accepted: boolean
        }
    ) {
        try {
            const userId = (client as any).userId
            const userName = (client as any).userName

            this.logger.log(
                `📤 RESPOND_PK_BATTLE request: User ${userName} (${userId}) ${data.accepted ? 'accepting' : 'declining'} battle ${data.battleId}`
            )

            const participant = await this.roomService.respondToPKBattle(
                data.battleId,
                userId,
                data.accepted
            )

            // Get battle details to emit to room
            const battleDetails = await this.roomService.getPKBattleDetails(
                data.battleId
            )

            // Emit to all users in the room
            this.server
                .to(`room_${battleDetails.roomId}`)
                .emit('pkBattleParticipantResponse', {
                    battleId: data.battleId,
                    userId,
                    userName,
                    accepted: data.accepted,
                    status: participant.status,
                    allParticipantsReady: battleDetails.participants.every(
                        (p) => p.status === 'accepted'
                    )
                })

            client.emit('respondToPKBattleResponse', {
                status: 'success',
                message: `Battle invitation ${data.accepted ? 'accepted' : 'declined'}`,
                battleId: data.battleId
            })

            this.logger.log(
                `✅ RESPOND_PK_BATTLE success: User ${userName} (${userId}) ${data.accepted ? 'accepted' : 'declined'} battle ${data.battleId}`
            )
        } catch (error) {
            this.logger.error(`❌ RESPOND_PK_BATTLE failed: ${error.message}`)

            client.emit('respondToPKBattleResponse', {
                status: 'error',
                message: error.message
            })
        }
    }

    @SubscribeMessage('startPKBattle')
    async handleStartPKBattle(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            battleId: string
        }
    ) {
        try {
            const userId = (client as any).userId
            const userName = (client as any).userName

            this.logger.log(
                `📤 START_PK_BATTLE request: User ${userName} (${userId}) starting battle ${data.battleId}`
            )

            const battle = await this.roomService.startPKBattle(
                data.battleId,
                userId
            )
            const battleDetails = await this.roomService.getPKBattleDetails(
                data.battleId
            )

            // Emit to all users in the room
            this.server
                .to(`room_${battleDetails.roomId}`)
                .emit('pkBattleStarted', {
                    battleId: battle.uuid,
                    status: battle.status,
                    startTime: battle.startTime,
                    endTime: battle.endTime,
                    remainingTime: battleDetails.remainingTime,
                    participants: battleDetails.participants
                })

            client.emit('startPKBattleResponse', {
                status: 'success',
                message: 'PK Battle started successfully',
                battleId: battle.uuid,
                remainingTime: battleDetails.remainingTime
            })

            this.logger.log(
                `✅ START_PK_BATTLE success: Battle ${battle.uuid} started by ${userName} (${userId})`
            )
        } catch (error) {
            this.logger.error(`❌ START_PK_BATTLE failed: ${error.message}`)

            client.emit('startPKBattleResponse', {
                status: 'error',
                message: error.message
            })
        }
    }

    @SubscribeMessage('sendPKBattleGift')
    async handleSendPKBattleGift(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            giftId: string
            receiverId: string
            quantity: number
            message?: string
            battleId: string
        }
    ) {
        try {
            const userId = (client as any).userId
            const userName = (client as any).userName

            this.logger.log(
                `📤 SEND_PK_BATTLE_GIFT request: User ${userName} (${userId}) sending gift to ${data.receiverId} in battle ${data.battleId}`
            )

            const battleGift = await this.roomService.sendPKBattleGift(
                data.battleId,
                data.giftId,
                userId,
                data.receiverId,
                data.quantity,
                data.message
            )

            // Get updated battle stats
            const battleDetails = await this.roomService.getPKBattleDetails(
                data.battleId
            )

            // Emit real-time gift to all users in the room
            this.server
                .to(`room_${battleDetails.roomId}`)
                .emit('pkBattleGiftReceived', {
                    battleId: data.battleId,
                    gift: {
                        id: battleGift.uuid,
                        giftName: battleGift.gift.name,
                        giftImageUrl: battleGift.gift.imageUrl,
                        senderId: userId,
                        senderName: userName,
                        receiverId: data.receiverId,
                        receiverName: battleGift.receiver.name,
                        quantity: battleGift.quantity,
                        value: battleGift.giftValue * battleGift.quantity,
                        message: battleGift.message,
                        sentAt: battleGift.sentAt
                    },
                    // Updated participant stats
                    participants: battleDetails.participants,
                    totalGiftsValue: battleDetails.totalGiftsValue
                })

            // Emit real-time progress update
            this.server
                .to(`room_${battleDetails.roomId}`)
                .emit('pkBattleProgressUpdate', {
                    battleId: data.battleId,
                    progress: battleDetails.progress,
                    participants: battleDetails.participants.map((p) => ({
                        userId: p.userId,
                        name: p.name,
                        totalGiftsReceived: p.totalGiftsReceived,
                        giftCount: p.giftCount
                    })),
                    totalGiftsValue: battleDetails.totalGiftsValue,
                    updatedAt: new Date()
                })

            // Get and emit highest sender update
            try {
                const highestSenderData =
                    await this.roomService.getPKBattleHighestSender(
                        data.battleId
                    )
                this.server
                    .to(`room_${battleDetails.roomId}`)
                    .emit('pkBattleHighestSender', {
                        battleId: data.battleId,
                        ...highestSenderData,
                        updatedAt: new Date()
                    })
            } catch (error) {
                this.logger.warn(
                    `Failed to get highest sender for battle ${data.battleId}: ${error.message}`
                )
            }

            // Send success response to sender
            client.emit('sendPKBattleGiftResponse', {
                status: 'success',
                message: 'Gift sent successfully',
                giftId: battleGift.uuid,
                totalValue: battleGift.giftValue * battleGift.quantity
            })

            this.logger.log(
                `✅ SEND_PK_BATTLE_GIFT success: Gift sent from ${userName} (${userId}) to ${data.receiverId} in battle ${data.battleId}`
            )
        } catch (error) {
            this.logger.error(`❌ SEND_PK_BATTLE_GIFT failed: ${error.message}`)

            client.emit('sendPKBattleGiftResponse', {
                status: 'error',
                message: error.message
            })
        }
    }

    @SubscribeMessage('getPKBattleStats')
    async handleGetPKBattleStats(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            battleId: string
        }
    ) {
        try {
            const userId = (client as any).userId

            this.logger.log(
                `📤 GET_PK_BATTLE_STATS request: User ${userId} requesting stats for battle ${data.battleId}`
            )

            const battleDetails = await this.roomService.getPKBattleDetails(
                data.battleId
            )

            client.emit('pkBattleStatsResponse', {
                status: 'success',
                data: battleDetails
            })

            this.logger.log(
                `✅ GET_PK_BATTLE_STATS success: Stats sent for battle ${data.battleId}`
            )
        } catch (error) {
            this.logger.error(`❌ GET_PK_BATTLE_STATS failed: ${error.message}`)

            client.emit('pkBattleStatsResponse', {
                status: 'error',
                message: error.message
            })
        }
    }

    @SubscribeMessage('cancelPKBattle')
    async handleCancelPKBattle(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            battleId: string
            reason?: string
        }
    ) {
        try {
            const userId = (client as any).userId
            const userName = (client as any).userName

            this.logger.log(
                `📤 CANCEL_PK_BATTLE request: User ${userName} (${userId}) cancelling battle ${data.battleId}`
            )

            const battle = await this.roomService.cancelPKBattle(
                data.battleId,
                userId,
                data.reason
            )

            // Get battle details to get room ID
            const battleDetails = await this.roomService.getPKBattleDetails(
                data.battleId
            )

            // Emit to all users in the room
            this.server
                .to(`room_${battleDetails.roomId}`)
                .emit('pkBattleCancelled', {
                    battleId: data.battleId,
                    reason: data.reason,
                    cancelledBy: userName,
                    cancelledAt: new Date()
                })

            client.emit('cancelPKBattleResponse', {
                status: 'success',
                message: 'PK Battle cancelled successfully',
                battleId: data.battleId
            })

            this.logger.log(
                `✅ CANCEL_PK_BATTLE success: Battle ${data.battleId} cancelled by ${userName} (${userId})`
            )
        } catch (error) {
            this.logger.error(`❌ CANCEL_PK_BATTLE failed: ${error.message}`)

            client.emit('cancelPKBattleResponse', {
                status: 'error',
                message: error.message
            })
        }
    }

    @SubscribeMessage('getActivePKBattle')
    async handleGetActivePKBattle(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            roomId: string
        }
    ) {
        try {
            const userId = (client as any).userId

            this.logger.log(
                `📤 GET_ACTIVE_PK_BATTLE request: User ${userId} requesting active battle for room ${data.roomId}`
            )

            const activeBattle = await this.roomService.getActivePKBattle(
                data.roomId
            )

            client.emit('activePKBattleResponse', {
                status: 'success',
                data: activeBattle
            })

            this.logger.log(
                `✅ GET_ACTIVE_PK_BATTLE success: ${activeBattle ? 'Found' : 'No'} active battle in room ${data.roomId}`
            )
        } catch (error) {
            this.logger.error(
                `❌ GET_ACTIVE_PK_BATTLE failed: ${error.message}`
            )

            client.emit('activePKBattleResponse', {
                status: 'error',
                message: error.message
            })
        }
    }

    @SubscribeMessage('getPKBattleProgress')
    async handleGetPKBattleProgress(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            battleId: string
        }
    ) {
        try {
            const userId = (client as any).userId

            this.logger.log(
                `📤 GET_PK_BATTLE_PROGRESS request: User ${userId} requesting progress for battle ${data.battleId}`
            )

            const battleDetails = await this.roomService.getPKBattleDetails(
                data.battleId
            )

            client.emit('pkBattleProgressResponse', {
                status: 'success',
                battleId: data.battleId,
                progress: battleDetails.progress,
                participants: battleDetails.participants.map((p) => ({
                    userId: p.userId,
                    name: p.name,
                    avatar: p.avatar,
                    totalGiftsReceived: p.totalGiftsReceived,
                    giftCount: p.giftCount,
                    position: p.position
                })),
                totalGiftsValue: battleDetails.totalGiftsValue,
                remainingTime: battleDetails.remainingTime
            })

            this.logger.log(
                `✅ GET_PK_BATTLE_PROGRESS success: Progress sent for battle ${data.battleId}`
            )
        } catch (error) {
            this.logger.error(
                `❌ GET_PK_BATTLE_PROGRESS failed: ${error.message}`
            )

            client.emit('pkBattleProgressResponse', {
                status: 'error',
                message: error.message
            })
        }
    }

    @SubscribeMessage('getPKBattleHighestSender')
    async handleGetPKBattleHighestSender(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            battleId: string
        }
    ) {
        try {
            const userId = (client as any).userId

            this.logger.log(
                `📤 GET_PK_BATTLE_HIGHEST_SENDER request: User ${userId} requesting highest sender for battle ${data.battleId}`
            )

            const highestSenderData =
                await this.roomService.getPKBattleHighestSender(data.battleId)

            client.emit('pkBattleHighestSenderResponse', {
                status: 'success',
                ...highestSenderData
            })

            this.logger.log(
                `✅ GET_PK_BATTLE_HIGHEST_SENDER success: Highest sender data sent for battle ${data.battleId}`
            )
        } catch (error) {
            this.logger.error(
                `❌ GET_PK_BATTLE_HIGHEST_SENDER failed: ${error.message}`
            )

            client.emit('pkBattleHighestSenderResponse', {
                status: 'error',
                message: error.message
            })
        }
    }

    /**
     * Auto-end PK Battle when time expires (called by service)
     */
    async emitPKBattleEnded(
        battleId: string,
        winnerId?: string,
        winnerName?: string
    ) {
        try {
            const battleDetails =
                await this.roomService.getPKBattleDetails(battleId)

            this.server
                .to(`room_${battleDetails.roomId}`)
                .emit('pkBattleEnded', {
                    battleId,
                    winnerId,
                    winnerName,
                    finalStats: battleDetails.participants,
                    totalGiftsValue: battleDetails.totalGiftsValue,
                    endedAt: new Date()
                })

            this.logger.log(
                `✅ PK_BATTLE_ENDED emitted: Battle ${battleId} ended, winner: ${winnerName || 'Draw'}`
            )
        } catch (error) {
            this.logger.error(
                `❌ PK_BATTLE_ENDED emit failed: ${error.message}`
            )
        }
    }
}
