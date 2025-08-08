import { Injectable, Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
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
import { ConversationService } from '../conversation/conversation.service'
import { FriendshipService } from '../friendship/friendship.service'
import { GroupService } from '../group/group.service'
import { UserService } from '../user/user.service'

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
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6
})
export class SocketIOGateway
    implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
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
        private readonly configService: ConfigService
    ) {
        // Log JWT configuration on startup
        const jwtSecret = this.configService.get<string>('JWT_SECRET')
        this.logger.log(
            `🔐 [STARTUP] JWT Secret configured: ${jwtSecret ? 'Yes' : 'No'}`
        )
        this.logger.log(
            `🔐 [STARTUP] JWT Secret length: ${jwtSecret?.length || 0} characters`
        )
        this.logger.log(
            `🔐 [STARTUP] JWT Secret first 4 chars: ${jwtSecret?.substring(
                0,
                4
            )}...`
        )

        // Warning if using default secret
        if (jwtSecret === 'your-jwt-secret-here') {
            this.logger.warn(
                '⚠️  [STARTUP] WARNING: Using default JWT secret! Please update JWT_SECRET in .env file'
            )
        }

        // Log connection configuration
        this.logger.log('📡 [STARTUP] Socket.IO Gateway Configuration:')
        this.logger.log('   ├─ Namespace: / (default)')
        this.logger.log('   ├─ Transports: websocket, polling')
        this.logger.log('   ├─ Ping Interval: 25000ms')
        this.logger.log('   ├─ Ping Timeout: 60000ms')
        this.logger.log('   ├─ Upgrade Timeout: 30000ms')
        this.logger.log('   ├─ Max HTTP Buffer: 1MB')
        this.logger.log('   ├─ CORS: All origins allowed')
        this.logger.log('   └─ Authentication: Disabled (Guest mode)')
    }

    afterInit(server: Server) {
        this.server = server
        this.logger.log('🚀 SocketIO Gateway initialized successfully')
        this.logger.log('📡 Default namespace (/) ready for connections')
        this.logger.log('🔄 Real-time messaging system active')
        this.logger.log(`🌐 CORS enabled for all origins`)
        this.logger.log(`🔧 Configuration:`)
        this.logger.log(`   ├─ Ping Interval: 25s`)
        this.logger.log(`   ├─ Ping Timeout: 60s`)
        this.logger.log(`   ├─ Upgrade Timeout: 30s`)
        this.logger.log(`   ├─ Max Buffer Size: 1MB`)
        this.logger.log(`   └─ Transports: websocket, polling`)
    }

    // Helper method to ensure user authentication (auth disabled)
    private ensureAuthenticated(client: AuthenticatedSocket): boolean {
        try {
            // Authentication disabled - always return true
            // Ensure userUuid is set if not already
            if (!client.userUuid) {
                // Generate a proper UUID for guest users to avoid validation issues
                const guestUuid = this.generateGuestUuid()
                client.userUuid = guestUuid
                client.userId = guestUuid
                client.userName = `Guest_${Date.now()}`
                client.userEmail = `${guestUuid}@guest.local`

                this.logger.debug(
                    `👻 [GUEST_AUTH] Created guest user: ${client.userName} (${guestUuid})`
                )
            }
            return true
        } catch (error) {
            this.logger.error(
                `❌ [GUEST_AUTH] Error setting up guest user: ${error.message}`
            )
            // Still return true to allow connection, but with minimal setup
            if (!client.userUuid) {
                client.userUuid = `guest_fallback_${Date.now()}`
                client.userId = client.userUuid
                client.userName = 'Guest_Fallback'
                client.userEmail = `${client.userUuid}@guest.local`
            }
            return true
        }
    }

    // Generate a proper UUID for guest users
    private generateGuestUuid(): string {
        // Generate a UUID v4 format but mark it as a guest
        const chars = '0123456789abcdef'
        let uuid = 'guest-'
        for (let i = 0; i < 8; i++)
            uuid += chars[Math.floor(Math.random() * 16)]
        uuid += '-'
        for (let i = 0; i < 4; i++)
            uuid += chars[Math.floor(Math.random() * 16)]
        uuid += '-4' // Version 4
        for (let i = 0; i < 3; i++)
            uuid += chars[Math.floor(Math.random() * 16)]
        uuid += '-'
        uuid += chars[8 + Math.floor(Math.random() * 4)] // Variant bits
        for (let i = 0; i < 3; i++)
            uuid += chars[Math.floor(Math.random() * 16)]
        uuid += '-'
        for (let i = 0; i < 12; i++)
            uuid += chars[Math.floor(Math.random() * 16)]
        return uuid
    }

    async handleConnection(client: AuthenticatedSocket) {
        const connectionTime = new Date().toISOString()
        const clientIp = client.handshake.address
        const userAgent = client.handshake.headers['user-agent']
        const transport = client.conn.transport.name

        this.logger.log(`🔌 [CONNECTION] New client connected`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(`   ├─ IP Address: ${clientIp}`)
        this.logger.log(`   ├─ User Agent: ${userAgent || 'Unknown'}`)
        this.logger.log(`   ├─ Transport: ${transport}`)
        this.logger.log(`   ├─ Connection Time: ${connectionTime}`)
        this.logger.log(
            `   └─ Total Active Connections: ${this.server.engine.clientsCount}`
        )

        // Authentication disabled - automatically set up guest user
        try {
            this.logger.log(
                `🔓 [CONNECTION] Authentication disabled - setting up guest user`
            )

            // Send immediate acknowledgment
            client.emit('connection_established', {
                success: true,
                socketId: client.id,
                timestamp: new Date().toISOString()
            })

            // Ensure authentication (which creates guest user)
            this.ensureAuthenticated(client)

            // Add to authenticated users map
            if (!this.authenticatedUsers.has(client.userUuid)) {
                this.authenticatedUsers.set(client.userUuid, [])
            }
            this.authenticatedUsers.get(client.userUuid)?.push(client)
            this.socketUserMap.set(client.id, client.userUuid)

            // Join users personal room
            const personalRoom = `user:${client.userUuid}`
            await client.join(personalRoom)
            this.logger.log(
                `🏠 [CONNECTION] Joined personal room: ${personalRoom}`
            )

            this.logger.log(
                `✅ [CONNECTION] Guest user setup completed successfully`
            )
            this.logger.log(`   ├─ User ID: ${client.userUuid}`)
            this.logger.log(`   ├─ User Name: ${client.userName}`)
            this.logger.log(`   └─ Personal Room: ${personalRoom}`)

            // Send comprehensive connection confirmation
            client.emit('connected', {
                success: true,
                message: 'Connected to real-time server (no auth required)',
                socketId: client.id,
                userId: client.userUuid,
                userName: client.userName,
                personalRoom: personalRoom,
                timestamp: new Date().toISOString(),
                server: {
                    version: '1.0.0',
                    features: ['chat', 'rooms', 'guest_mode'],
                    pingInterval: 25000,
                    pingTimeout: 60000
                }
            })

            // Also emit the old format for compatibility
            client.emit('connect_success', {
                socketId: client.id,
                userId: client.userUuid,
                userName: client.userName
            })

            this.logger.log(
                `📤 [CONNECTION] Sent connection confirmation events`
            )
        } catch (error) {
            this.logger.error(`❌ [CONNECTION] Connection setup failed`)
            this.logger.error(`   ├─ Socket ID: ${client.id}`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   └─ Stack: ${error.stack}`)

            client.emit('connectionError', {
                success: false,
                message: 'Connection setup failed',
                error: error.message
            })

            // Dont disconnect - let the client retry
        }
    }

    async handleDisconnect(client: AuthenticatedSocket) {
        const disconnectionTime = new Date().toISOString()
        const userId = client.userUuid
        const userName = client.userName

        this.logger.log(`🔌 [DISCONNECTION] Client disconnected`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${userName || 'Anonymous'} (${userId || 'Not authenticated'})`
        )
        this.logger.log(`   ├─ Disconnection Time: ${disconnectionTime}`)
        this.logger.log(
            `   └─ Remaining Connections: ${Math.max(
                0,
                this.server.engine.clientsCount - 1
            )}`
        )

        if (client.userUuid) {
            // Remove from authenticated users map
            const userSockets =
                this.authenticatedUsers.get(client.userUuid) || []
            const updatedSockets = userSockets.filter(
                (socket) => socket.id !== client.id
            )

            if (updatedSockets.length === 0) {
                this.authenticatedUsers.delete(client.userUuid)
                // Update user status to offline
                await this.updateUserStatus(client.userUuid, 'offline')
                this.logger.log(`👋 [USER_OFFLINE] User went offline`)
                this.logger.log(`   ├─ User: ${userName} (${userId})`)
                this.logger.log(`   └─ All sessions disconnected`)
            } else {
                this.authenticatedUsers.set(client.userUuid, updatedSockets)
                this.logger.log(
                    `📱 [SESSION_END] User session ended but other sessions remain`
                )
                this.logger.log(`   ├─ User: ${userName} (${userId})`)
                this.logger.log(
                    `   └─ Active Sessions: ${updatedSockets.length}`
                )
            }

            // Remove from socket user map
            this.socketUserMap.delete(client.id)

            // Leave all rooms
            client.rooms.forEach((room) => {
                if (room !== client.id) {
                    client.leave(room)
                    this.logger.log(`🚪 [ROOM_LEAVE] User left room: ${room}`)
                }
            })
        }
    }

    // ==================== CONNECTION HEALTH ====================
    @SubscribeMessage('ping')
    async handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
        this.logger.debug(`🏓 [PING] Received ping from ${client.id}`)
        client.emit('pong', {
            timestamp: new Date().toISOString(),
            clientId: client.id
        })
        return { success: true, timestamp: new Date().toISOString() }
    }

    @SubscribeMessage('pong')
    async handlePong(@ConnectedSocket() client: AuthenticatedSocket) {
        this.logger.debug(`🏓 [PONG] Received pong from ${client.id}`)
        return { success: true }
    }

    @SubscribeMessage('heartbeat')
    async handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket) {
        this.logger.debug(`💓 [HEARTBEAT] Received heartbeat from ${client.id}`)
        client.emit('heartbeat_ack', {
            timestamp: new Date().toISOString(),
            server_time: Date.now()
        })
        return { success: true, server_time: Date.now() }
    }

    @SubscribeMessage('connection_check')
    async handleConnectionCheck(
        @ConnectedSocket() client: AuthenticatedSocket
    ) {
        this.logger.debug(
            `🔍 [CONNECTION_CHECK] Connection check from ${client.id}`
        )

        const userInfo = client.userUuid
            ? {
                  userId: client.userUuid,
                  userName: client.userName,
                  connected: true,
                  authenticatedUsers: this.authenticatedUsers.size,
                  totalSockets: this.server.engine.clientsCount
              }
            : null

        client.emit('connection_status', {
            connected: true,
            socketId: client.id,
            timestamp: new Date().toISOString(),
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                connections: this.server.engine.clientsCount
            },
            user: userInfo
        })

        return { success: true, connected: true }
    }

    // ==================== AUTHENTICATION ====================
    @SubscribeMessage('authenticate')
    async handleAuthenticate(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { token: string }
    ) {
        const startTime = Date.now()

        this.logger.log(`🔐 [AUTHENTICATE] Authentication attempt`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(`   ├─ Token Present: ${data?.token ? 'Yes' : 'No'}`)
        this.logger.log(`   ├─ Token Length: ${data?.token?.length || 0} chars`)
        this.logger.log(
            `   ├─ Token first 20 chars: ${data?.token?.substring(0, 20)}...`
        )
        this.logger.log(`   └─ Client IP: ${client.handshake.address}`)

        try {
            if (!data?.token) {
                this.logger.error(`❌ [AUTHENTICATE] Missing token`)
                client.emit('authenticationError', {
                    success: false,
                    message: 'Token is required',
                    code: 'TOKEN_MISSING'
                })
                client.disconnect(true)
                return { success: false, error: 'Token is required' }
            }

            this.logger.log(`🔍 [AUTHENTICATE] Verifying JWT token`)

            // Try to decode without verification first to see the payload
            try {
                const decoded = this.jwtService.decode(data.token) as any
                const now = Math.floor(Date.now() / 1000)
                const isExpired = decoded?.exp && decoded.exp < now

                this.logger.log(
                    `🔍 [AUTHENTICATE] Token decoded (without verification):`
                )
                this.logger.log(`   ├─ User ID: ${decoded?.id}`)
                this.logger.log(`   ├─ User UUID: ${decoded?.uuid}`)
                this.logger.log(`   ├─ Email: ${decoded?.email}`)
                this.logger.log(
                    `   ├─ Issued At: ${
                        decoded?.iat
                            ? new Date(decoded.iat * 1000).toISOString()
                            : 'N/A'
                    }`
                )
                this.logger.log(
                    `   ├─ Expires At: ${
                        decoded?.exp
                            ? new Date(decoded.exp * 1000).toISOString()
                            : 'N/A'
                    }`
                )
                this.logger.log(
                    `   └─ Token Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`
                )

                if (isExpired) {
                    const expiredSince = now - decoded.exp
                    this.logger.warn(
                        `⚠️  [AUTHENTICATE] Token expired ${expiredSince} seconds ago`
                    )
                }
            } catch (decodeError) {
                this.logger.error(
                    `❌ [AUTHENTICATE] Failed to decode token: ${decodeError.message}`
                )
            }

            // Verify JWT token with additional error handling
            let payload: any
            try {
                // For development, you might want to disable expiration check temporarily
                const verifyOptions: any = {}

                // Uncomment the following line to ignore token expiration in development
                // if (process.env.NODE_ENV === 'development') {
                //     verifyOptions.ignoreExpiration = true
                //     this.logger.warn('⚠️  [AUTHENTICATE] Ignoring token expiration in development mode')
                // }

                payload = this.jwtService.verify(data.token, verifyOptions)
            } catch (jwtError) {
                // Log the specific JWT error for debugging
                this.logger.error(
                    `🔐 [AUTHENTICATE] JWT verification error: ${jwtError.name}`
                )
                this.logger.error(`   ├─ Message: ${jwtError.message}`)

                // Log current JWT configuration
                const currentSecret =
                    this.configService.get<string>('JWT_SECRET')
                this.logger.error(
                    `   ├─ Current JWT Secret length: ${currentSecret?.length || 0}`
                )
                this.logger.error(
                    `   └─ Current JWT Secret first 4 chars: ${currentSecret?.substring(0, 4)}...`
                )

                // Provide specific error messages based on JWT error type
                let errorMessage = 'Invalid token'
                let errorCode = 'TOKEN_INVALID'

                if (jwtError.name === 'TokenExpiredError') {
                    errorMessage = 'Token has expired. Please log in again.'
                    errorCode = 'TOKEN_EXPIRED'

                    // Log expiration details
                    const decoded = this.jwtService.decode(data.token) as any
                    if (decoded?.exp) {
                        const expiredAt = new Date(
                            decoded.exp * 1000
                        ).toISOString()
                        this.logger.error(
                            `   └─ Token expired at: ${expiredAt}`
                        )
                    }
                } else if (jwtError.name === 'JsonWebTokenError') {
                    if (jwtError.message === 'invalid signature') {
                        errorMessage =
                            'Invalid token signature. This may be due to a server configuration change.'
                        errorCode = 'TOKEN_INVALID_SIGNATURE'

                        // Additional warning if using default secret
                        if (currentSecret === 'your-jwt-secret-here') {
                            errorMessage +=
                                ' The server is using a default JWT secret.'
                            this.logger.error(
                                '   └─ ⚠️  Server is using default JWT secret!'
                            )
                        }
                    } else if (jwtError.message === 'jwt malformed') {
                        errorMessage = 'Malformed token'
                        errorCode = 'TOKEN_MALFORMED'
                    }
                }

                throw {
                    message: errorMessage,
                    code: errorCode,
                    originalError: jwtError
                }
            }

            // Validate payload structure
            if (!payload.uuid || !payload.email) {
                throw {
                    message: 'Invalid token payload',
                    code: 'TOKEN_INVALID_PAYLOAD'
                }
            }

            // Set user data on socket
            client.userId = payload.id?.toString()
            client.userUuid = payload.uuid
            client.userName = payload.name || payload.email
            client.userEmail = payload.email
            client.userAvatarUrl = payload.avatarUrl || null

            // Add to authenticated users map
            const userSockets =
                this.authenticatedUsers.get(client.userUuid) || []
            userSockets.push(client)
            this.authenticatedUsers.set(client.userUuid, userSockets)

            // Add to socket user map
            this.socketUserMap.set(client.id, client.userUuid)

            // Join user's personal room
            client.join(`user:${client.userUuid}`)
            this.logger.log(
                `🏠 [ROOM_JOIN] Joined personal room: user:${client.userUuid}`
            )

            // Join all user's conversation rooms
            await this.joinUserConversations(client)

            // Join all user's group rooms
            await this.joinUserGroups(client)

            // Update user status to online
            await this.updateUserStatus(client.userUuid, 'online')

            const duration = Date.now() - startTime
            this.logger.log(`✅ [AUTHENTICATE] Authentication successful`)
            this.logger.log(`   ├─ Socket ID: ${client.id}`)
            this.logger.log(`   ├─ User ID: ${client.userUuid}`)
            this.logger.log(`   ├─ User Name: ${client.userName}`)
            this.logger.log(`   ├─ User Email: ${client.userEmail}`)
            this.logger.log(`   ├─ User Sessions: ${userSockets.length}`)
            this.logger.log(`   ├─ Duration: ${duration}ms`)
            this.logger.log(
                `   └─ Total Authenticated Users: ${this.authenticatedUsers.size}`
            )

            client.emit('authenticated', {
                success: true,
                userId: client.userUuid,
                userName: client.userName,
                message: 'Authentication successful'
            })

            return { success: true, userId: client.userUuid }
        } catch (error) {
            const duration = Date.now() - startTime
            this.logger.error(`❌ [AUTHENTICATE] Authentication failed`)
            this.logger.error(`   ├─ Socket ID: ${client.id}`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   ├─ Error Code: ${error.code || 'UNKNOWN'}`)
            this.logger.error(`   ├─ Duration: ${duration}ms`)
            if (error.originalError) {
                this.logger.error(
                    `   └─ Original Error: ${error.originalError.message}`
                )
            }

            client.emit('authenticationError', {
                success: false,
                message: error.message || 'Invalid token',
                code: error.code || 'TOKEN_INVALID',
                requiresReauth:
                    error.code === 'TOKEN_EXPIRED' ||
                    error.code === 'TOKEN_INVALID_SIGNATURE'
            })

            client.disconnect(true)
            return { success: false, error: error.message }
        }
    }

    // ==================== SETUP ====================
    @SubscribeMessage('setup')
    async handleSetup(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: any
    ) {
        this.logger.log(
            `🔧 [SETUP] User setup initiated (authentication disabled)`
        )
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(`   ├─ Setup Data: ${JSON.stringify(data)}`)

        try {
            // Skip authentication - allow all connections
            // Use provided userId from data or generate a proper guest UUID
            const userId =
                data?.userId || data?.userUuid || this.generateGuestUuid()
            const userName =
                data?.userName || data?.name || `Guest_${Date.now()}`

            // Set user info on socket
            client.userUuid = userId
            client.userId = userId
            client.userName = userName
            client.userEmail = data?.email || `${userId}@guest.local`

            const personalRoom = `user:${userId}`
            await client.join(personalRoom)

            this.logger.log(
                `✅ [SETUP] Guest user joined personal room: ${personalRoom}`
            )

            // Add to authenticated users map
            if (!this.authenticatedUsers.has(userId)) {
                this.authenticatedUsers.set(userId, [])
            }
            this.authenticatedUsers.get(userId)?.push(client)
            this.socketUserMap.set(client.id, userId)

            // Emit successful setup
            client.emit('setupComplete', {
                success: true,
                message: 'User setup completed successfully (no auth required)',
                userId: userId,
                userName: userName,
                personalRoom: personalRoom,
                timestamp: new Date().toISOString()
            })

            return { success: true, message: 'Setup completed' }
        } catch (error) {
            this.logger.error(
                `❌ [SETUP] Setup failed: ${error.message}`,
                error.stack
            )
            client.emit('setupError', {
                success: false,
                message: error.message || 'Setup failed',
                code: 'SETUP_FAILED'
            })
            return { success: false, error: error.message }
        }
    }

    // Add a debug method for testing
    @SubscribeMessage('debugJwtInfo')
    async handleDebugJwtInfo(@ConnectedSocket() client: AuthenticatedSocket) {
        const jwtSecret = this.configService.get<string>('JWT_SECRET')

        return {
            secretConfigured: !!jwtSecret,
            secretLength: jwtSecret?.length || 0,
            secretPreview: jwtSecret?.substring(0, 4) + '...',
            isDefaultSecret: jwtSecret === 'your-jwt-secret-here',
            environment: process.env.NODE_ENV || 'development'
        }
    }

    // ==================== DIRECT MESSAGING ====================
    @SubscribeMessage('sendDirectMessage')
    async handleDirectMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            recipientId: string
            type: 'text' | 'image' | 'file' | 'voice'
            content?: string
            fileUrl?: string
            metadata?: any
        }
    ) {
        const startTime = Date.now()
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        this.logger.log(`💬 [DIRECT_MESSAGE] Sending direct message`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ Sender: ${client.userName || 'Unknown'} (${client.userUuid || 'N/A'})`
        )
        this.logger.log(`   ├─ Recipient ID: ${data.recipientId}`)
        this.logger.log(`   ├─ Message Type: ${data.type}`)
        this.logger.log(
            `   ├─ Content Length: ${data.content?.length || 0} chars`
        )
        this.logger.log(`   ├─ File URL: ${data.fileUrl ? 'Present' : 'None'}`)
        this.logger.log(`   └─ Message ID: ${messageId}`)

        // Ensure authentication (always passes with auth disabled)
        this.ensureAuthenticated(client)

        if (!data.recipientId) {
            this.logger.error(`❌ [DIRECT_MESSAGE] Missing recipient ID`)
            return { success: false, error: 'Recipient ID is required' }
        }

        try {
            this.logger.log(
                `🔍 [DIRECT_MESSAGE] Getting or creating conversation`
            )

            // Get or create direct conversation
            const conversation =
                await this.conversationService.getOrCreateDirectConversation(
                    client.userUuid,
                    data.recipientId
                )

            this.logger.log(`💾 [DIRECT_MESSAGE] Creating message in database`)
            this.logger.log(`   └─ Conversation ID: ${conversation.uuid}`)

            // Create message
            const message = await this.conversationService.createMessage({
                conversationId: conversation.uuid,
                senderId: client.userUuid,
                type: data.type as any,
                content: data.content,
                fileUrl: data.fileUrl
            })

            // Count participants in conversation room
            const roomName = `conversation:${conversation.uuid}`
            const participantsCount =
                this.server.sockets.adapter.rooms.get(roomName)?.size || 0

            this.logger.log(
                `📡 [DIRECT_MESSAGE] Broadcasting to conversation participants`
            )
            this.logger.log(`   ├─ Room: ${roomName}`)
            this.logger.log(`   └─ Online Participants: ${participantsCount}`)

            // Emit to conversation participants
            this.server.to(roomName).emit('newDirectMessage', {
                conversationId: conversation.uuid,
                message,
                sender: {
                    uuid: client.userUuid,
                    name: client.userName,
                    avatarUrl: client.userAvatarUrl
                }
            })

            const duration = Date.now() - startTime
            this.logger.log(`✅ [DIRECT_MESSAGE] Message sent successfully`)
            this.logger.log(`   ├─ Message ID: ${message.id || messageId}`)
            this.logger.log(`   ├─ Conversation ID: ${conversation.uuid}`)
            this.logger.log(`   ├─ Recipients Notified: ${participantsCount}`)
            this.logger.log(`   └─ Duration: ${duration}ms`)

            return { success: true, message, conversationId: conversation.uuid }
        } catch (error) {
            const duration = Date.now() - startTime
            this.logger.error(`❌ [DIRECT_MESSAGE] Message send failed`)
            this.logger.error(`   ├─ Message ID: ${messageId}`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   ├─ Duration: ${duration}ms`)
            this.logger.error(`   └─ Stack: ${error.stack}`)
            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('joinDirectConversation')
    async handleJoinDirectConversation(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { conversationId: string }
    ) {
        const startTime = Date.now()

        this.logger.log(`🚪 [JOIN_CONVERSATION] Joining direct conversation`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${client.userName || 'Unknown'} (${client.userUuid || 'N/A'})`
        )
        this.logger.log(`   └─ Conversation ID: ${data.conversationId}`)

        if (!client.userUuid) {
            this.logger.error(`❌ [JOIN_CONVERSATION] Unauthenticated client`)
            return { success: false, error: 'User not authenticated' }
        }

        if (!data.conversationId) {
            this.logger.error(`❌ [JOIN_CONVERSATION] Missing conversation ID`)
            return { success: false, error: 'Conversation ID is required' }
        }

        try {
            this.logger.log(
                `🔍 [JOIN_CONVERSATION] Verifying conversation access`
            )

            // Verify user is part of this conversation
            const conversation = await this.conversationService.getConversation(
                data.conversationId
            )

            if (!conversation.participantIds.includes(client.userUuid)) {
                this.logger.error(`❌ [JOIN_CONVERSATION] Access denied`)
                this.logger.error(`   ├─ User ID: ${client.userUuid}`)
                this.logger.error(
                    `   └─ Participants: ${conversation.participantIds.join(', ')}`
                )
                return { success: false, error: 'Access denied' }
            }

            // Join conversation room
            const roomName = `conversation:${data.conversationId}`
            client.join(roomName)

            // Count current participants in room
            const participantsCount =
                this.server.sockets.adapter.rooms.get(roomName)?.size || 0

            const duration = Date.now() - startTime
            this.logger.log(
                `✅ [JOIN_CONVERSATION] Successfully joined conversation`
            )
            this.logger.log(`   ├─ Room: ${roomName}`)
            this.logger.log(`   ├─ Online Participants: ${participantsCount}`)
            this.logger.log(`   └─ Duration: ${duration}ms`)

            return { success: true, conversationId: data.conversationId }
        } catch (error) {
            const duration = Date.now() - startTime
            this.logger.error(
                `❌ [JOIN_CONVERSATION] Failed to join conversation`
            )
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   ├─ Duration: ${duration}ms`)
            this.logger.error(`   └─ Stack: ${error.stack}`)
            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('leaveDirectConversation')
    async handleLeaveDirectConversation(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { conversationId: string }
    ) {
        this.logger.log(`🚪 [LEAVE_CONVERSATION] Leaving direct conversation`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${client.userName || 'Unknown'} (${client.userUuid || 'N/A'})`
        )
        this.logger.log(`   └─ Conversation ID: ${data.conversationId}`)

        const roomName = `conversation:${data.conversationId}`

        // Count participants before leaving
        const participantsBeforeLeave =
            this.server.sockets.adapter.rooms.get(roomName)?.size || 0

        client.leave(roomName)

        // Count participants after leaving
        const participantsAfterLeave =
            this.server.sockets.adapter.rooms.get(roomName)?.size || 0

        this.logger.log(
            `✅ [LEAVE_CONVERSATION] Successfully left conversation`
        )
        this.logger.log(`   ├─ Room: ${roomName}`)
        this.logger.log(`   ├─ Participants Before: ${participantsBeforeLeave}`)
        this.logger.log(`   └─ Participants After: ${participantsAfterLeave}`)

        return { success: true, conversationId: data.conversationId }
    }

    // ==================== GROUP MESSAGING ====================
    @SubscribeMessage('sendGroupMessage')
    async handleGroupMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            groupId: string
            type: 'text' | 'image' | 'file' | 'voice'
            content?: string
            fileUrl?: string
            metadata?: any
            replyToMessageId?: string
        }
    ) {
        const startTime = Date.now()
        const messageId = `grp_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        this.logger.log(`👥 [GROUP_MESSAGE] Sending group message`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ Sender: ${client.userName || 'Unknown'} (${client.userUuid || 'N/A'})`
        )
        this.logger.log(`   ├─ Group ID: ${data.groupId}`)
        this.logger.log(`   ├─ Message Type: ${data.type}`)
        this.logger.log(
            `   ├─ Content Length: ${data.content?.length || 0} chars`
        )
        this.logger.log(`   ├─ File URL: ${data.fileUrl ? 'Present' : 'None'}`)
        this.logger.log(`   ├─ Reply To: ${data.replyToMessageId || 'None'}`)
        this.logger.log(`   └─ Message ID: ${messageId}`)

        if (!client.userUuid) {
            this.logger.error(`❌ [GROUP_MESSAGE] Unauthenticated client`)
            return { success: false, error: 'User not authenticated' }
        }

        if (!data.groupId) {
            this.logger.error(`❌ [GROUP_MESSAGE] Missing group ID`)
            return { success: false, error: 'Group ID is required' }
        }

        try {
            this.logger.log(`🔍 [GROUP_MESSAGE] Verifying group membership`)

            // Verify user is a member of the group
            const isMember = await this.isUserGroupMember(
                client.userUuid,
                data.groupId
            )
            if (!isMember) {
                this.logger.error(
                    `❌ [GROUP_MESSAGE] Access denied - not a group member`
                )
                this.logger.error(`   ├─ User ID: ${client.userUuid}`)
                this.logger.error(`   └─ Group ID: ${data.groupId}`)
                return {
                    success: false,
                    error: 'You are not a member of this group'
                }
            }

            this.logger.log(`💾 [GROUP_MESSAGE] Creating message in database`)

            // Create group message - for now using conversation service with group type
            const message = await this.conversationService.createMessage({
                conversationId: `group:${data.groupId}`,
                senderId: client.userUuid,
                type: data.type as any,
                content: data.content,
                fileUrl: data.fileUrl
            })

            // Count group members in room
            const roomName = `group:${data.groupId}`
            const membersCount =
                this.server.sockets.adapter.rooms.get(roomName)?.size || 0

            this.logger.log(`📡 [GROUP_MESSAGE] Broadcasting to group members`)
            this.logger.log(`   ├─ Room: ${roomName}`)
            this.logger.log(`   └─ Online Members: ${membersCount}`)

            // Emit to all group members
            this.server.to(roomName).emit('GroupMessageReceived', {
                content: message.content,
                senderId: client.userUuid,
                senderName: client.userName,
                senderImage: client.userAvatarUrl || null,
                createdAt: new Date().toISOString(),
                groupId: data.groupId,
                messageType: data.type,
                messageId: messageId,
                metadata: data.metadata,
                replyToMessageId: data.replyToMessageId
            })

            const duration = Date.now() - startTime
            this.logger.log(
                `✅ [GROUP_MESSAGE] Group message sent successfully`
            )
            this.logger.log(`   ├─ Message ID: ${message.id || messageId}`)
            this.logger.log(`   ├─ Group ID: ${data.groupId}`)
            this.logger.log(`   ├─ Members Notified: ${membersCount}`)
            this.logger.log(`   └─ Duration: ${duration}ms`)

            return { success: true, message, groupId: data.groupId }
        } catch (error) {
            const duration = Date.now() - startTime
            this.logger.error(`❌ [GROUP_MESSAGE] Group message send failed`)
            this.logger.error(`   ├─ Message ID: ${messageId}`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   ├─ Duration: ${duration}ms`)
            this.logger.error(`   └─ Stack: ${error.stack}`)
            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('joinGroup')
    async handleJoinGroup(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { groupId: string }
    ) {
        const startTime = Date.now()

        this.logger.log(`👥 [JOIN_GROUP] Joining group`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${client.userName || 'Unknown'} (${client.userUuid || 'N/A'})`
        )
        this.logger.log(`   └─ Group ID: ${data.groupId}`)

        if (!client.userUuid) {
            this.logger.error(`❌ [JOIN_GROUP] Unauthenticated client`)
            return { success: false, error: 'User not authenticated' }
        }

        if (!data.groupId) {
            this.logger.error(`❌ [JOIN_GROUP] Missing group ID`)
            return { success: false, error: 'Group ID is required' }
        }

        try {
            this.logger.log(`🔍 [JOIN_GROUP] Verifying group membership`)

            // Verify user is a member of the group
            const isMember = await this.isUserGroupMember(
                client.userUuid,
                data.groupId
            )
            if (!isMember) {
                this.logger.error(
                    `❌ [JOIN_GROUP] Access denied - not a group member`
                )
                this.logger.error(`   ├─ User ID: ${client.userUuid}`)
                this.logger.error(`   └─ Group ID: ${data.groupId}`)
                return {
                    success: false,
                    error: 'You are not a member of this group'
                }
            }

            // Join group room
            const roomName = `group:${data.groupId}`
            client.join(roomName)

            // Count current members in room
            const membersCount =
                this.server.sockets.adapter.rooms.get(roomName)?.size || 0

            this.logger.log(`📢 [JOIN_GROUP] Notifying other group members`)

            // Notify other group members
            client.to(roomName).emit('userJoinedGroup', {
                groupId: data.groupId,
                user: {
                    uuid: client.userUuid,
                    name: client.userName,
                    avatarUrl: client.userAvatarUrl
                }
            })

            const duration = Date.now() - startTime
            this.logger.log(`✅ [JOIN_GROUP] Successfully joined group`)
            this.logger.log(`   ├─ Room: ${roomName}`)
            this.logger.log(`   ├─ Online Members: ${membersCount}`)
            this.logger.log(`   └─ Duration: ${duration}ms`)

            return { success: true, groupId: data.groupId }
        } catch (error) {
            const duration = Date.now() - startTime
            this.logger.error(`❌ [JOIN_GROUP] Failed to join group`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   ├─ Duration: ${duration}ms`)
            this.logger.error(`   └─ Stack: ${error.stack}`)
            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('leaveGroup')
    async handleLeaveGroup(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { groupId: string }
    ) {
        this.logger.log(`👥 [LEAVE_GROUP] Leaving group`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${client.userName || 'Unknown'} (${client.userUuid || 'N/A'})`
        )
        this.logger.log(`   └─ Group ID: ${data.groupId}`)

        const roomName = `group:${data.groupId}`

        // Count members before leaving
        const membersBeforeLeave =
            this.server.sockets.adapter.rooms.get(roomName)?.size || 0

        client.leave(roomName)

        // Count members after leaving
        const membersAfterLeave =
            this.server.sockets.adapter.rooms.get(roomName)?.size || 0

        this.logger.log(`📢 [LEAVE_GROUP] Notifying other group members`)

        // Notify other group members
        client.to(roomName).emit('userLeftGroup', {
            groupId: data.groupId,
            user: {
                uuid: client.userUuid,
                name: client.userName,
                avatarUrl: client.userAvatarUrl
            }
        })

        this.logger.log(`✅ [LEAVE_GROUP] Successfully left group`)
        this.logger.log(`   ├─ Room: ${roomName}`)
        this.logger.log(`   ├─ Members Before: ${membersBeforeLeave}`)
        this.logger.log(`   └─ Members After: ${membersAfterLeave}`)

        return { success: true, groupId: data.groupId }
    }

    // ==================== TYPING INDICATORS ====================
    @SubscribeMessage('typing')
    async handleTyping(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            conversationId?: string
            groupId?: string
            isTyping: boolean
        }
    ) {
        this.logger.log(`⌨️ [TYPING] Typing indicator`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${client.userName || 'Unknown'} (${client.userUuid || 'N/A'})`
        )
        this.logger.log(
            `   ├─ Conversation ID: ${data.conversationId || 'None'}`
        )
        this.logger.log(`   ├─ Group ID: ${data.groupId || 'None'}`)
        this.logger.log(`   └─ Is Typing: ${data.isTyping}`)

        if (!client.userUuid) {
            this.logger.error(`❌ [TYPING] Unauthenticated client`)
            return { success: false, error: 'User not authenticated' }
        }

        if (!data.conversationId && !data.groupId) {
            this.logger.error(`❌ [TYPING] Missing conversation or group ID`)
            return {
                success: false,
                error: 'Conversation ID or Group ID is required'
            }
        }

        const room = data.conversationId
            ? `conversation:${data.conversationId}`
            : `group:${data.groupId}`

        // Count recipients
        const recipientsCount =
            this.server.sockets.adapter.rooms.get(room)?.size || 0

        this.logger.log(`📡 [TYPING] Broadcasting typing status`)
        this.logger.log(`   ├─ Room: ${room}`)
        this.logger.log(`   └─ Recipients: ${Math.max(0, recipientsCount - 1)}`) // Exclude sender

        client.to(room).emit('userTyping', {
            userId: client.userUuid,
            userName: client.userName,
            conversationId: data.conversationId,
            groupId: data.groupId,
            isTyping: data.isTyping,
            timestamp: new Date().toISOString()
        })

        this.logger.log(`✅ [TYPING] Typing status broadcasted successfully`)

        return { success: true }
    }

    // ==================== MESSAGE STATUS ====================
    @SubscribeMessage('markAsRead')
    async handleMarkAsRead(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            conversationId?: string
            groupId?: string
            messageIds: string[]
        }
    ) {
        const startTime = Date.now()

        this.logger.log(`📖 [MARK_READ] Marking messages as read`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${client.userName || 'Unknown'} (${client.userUuid || 'N/A'})`
        )
        this.logger.log(
            `   ├─ Conversation ID: ${data.conversationId || 'None'}`
        )
        this.logger.log(`   ├─ Group ID: ${data.groupId || 'None'}`)
        this.logger.log(`   └─ Message Count: ${data.messageIds?.length || 0}`)

        if (!client.userUuid) {
            this.logger.error(`❌ [MARK_READ] Unauthenticated client`)
            return { success: false, error: 'User not authenticated' }
        }

        if (!data.conversationId && !data.groupId) {
            this.logger.error(`❌ [MARK_READ] Missing conversation or group ID`)
            return {
                success: false,
                error: 'Conversation ID or Group ID is required'
            }
        }

        if (!data.messageIds || data.messageIds.length === 0) {
            this.logger.error(`❌ [MARK_READ] No message IDs provided`)
            return { success: false, error: 'Message IDs are required' }
        }

        try {
            if (data.conversationId) {
                this.logger.log(
                    `💾 [MARK_READ] Updating conversation message read status`
                )

                await this.conversationService.markMessagesAsRead(
                    data.conversationId,
                    data.messageIds,
                    client.userUuid
                )

                const roomName = `conversation:${data.conversationId}`
                const participantsCount =
                    this.server.sockets.adapter.rooms.get(roomName)?.size || 0

                this.logger.log(
                    `📡 [MARK_READ] Broadcasting read status to conversation`
                )
                this.logger.log(`   ├─ Room: ${roomName}`)
                this.logger.log(
                    `   └─ Recipients: ${Math.max(0, participantsCount - 1)}`
                )

                this.server.to(roomName).emit('messagesRead', {
                    conversationId: data.conversationId,
                    messageIds: data.messageIds,
                    readBy: {
                        uuid: client.userUuid,
                        name: client.userName
                    },
                    timestamp: new Date().toISOString()
                })
            } else if (data.groupId) {
                this.logger.log(
                    `💾 [MARK_READ] Updating group message read status`
                )

                const roomName = `group:${data.groupId}`
                const membersCount =
                    this.server.sockets.adapter.rooms.get(roomName)?.size || 0

                this.logger.log(
                    `📡 [MARK_READ] Broadcasting read status to group`
                )
                this.logger.log(`   ├─ Room: ${roomName}`)
                this.logger.log(
                    `   └─ Recipients: ${Math.max(0, membersCount - 1)}`
                )

                // Handle group message read status
                this.server.to(roomName).emit('groupMessagesRead', {
                    groupId: data.groupId,
                    messageIds: data.messageIds,
                    readBy: {
                        uuid: client.userUuid,
                        name: client.userName
                    },
                    timestamp: new Date().toISOString()
                })
            }

            const duration = Date.now() - startTime
            this.logger.log(
                `✅ [MARK_READ] Messages marked as read successfully`
            )
            this.logger.log(
                `   ├─ Messages Processed: ${data.messageIds.length}`
            )
            this.logger.log(`   └─ Duration: ${duration}ms`)

            return { success: true }
        } catch (error) {
            const duration = Date.now() - startTime
            this.logger.error(`❌ [MARK_READ] Failed to mark messages as read`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   ├─ Duration: ${duration}ms`)
            this.logger.error(`   └─ Stack: ${error.stack}`)
            return { success: false, error: error.message }
        }
    }

    // ==================== USER STATUS ====================
    @SubscribeMessage('updateStatus')
    async handleUpdateStatus(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { status: 'online' | 'away' | 'busy' | 'offline' }
    ) {
        const startTime = Date.now()

        this.logger.log(`👤 [UPDATE_STATUS] Updating user status`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${client.userName || 'Unknown'} (${client.userUuid || 'N/A'})`
        )
        this.logger.log(`   └─ New Status: ${data.status}`)

        if (!client.userUuid) {
            this.logger.error(`❌ [UPDATE_STATUS] Unauthenticated client`)
            return { success: false, error: 'User not authenticated' }
        }

        if (!data.status) {
            this.logger.error(`❌ [UPDATE_STATUS] Missing status`)
            return { success: false, error: 'Status is required' }
        }

        try {
            this.logger.log(`💾 [UPDATE_STATUS] Updating status in database`)

            await this.updateUserStatus(client.userUuid, data.status)

            // Broadcast status change to all authenticated users (should be friends only in production)
            const authenticatedCount = this.authenticatedUsers.size
            this.logger.log(`📡 [UPDATE_STATUS] Broadcasting status change`)
            this.logger.log(`   └─ Authenticated Users: ${authenticatedCount}`)

            // Broadcast to friends/contacts - for now broadcast to all authenticated users
            this.authenticatedUsers.forEach((userSockets, userId) => {
                if (userId !== client.userUuid) {
                    userSockets.forEach((socket) => {
                        socket.emit('userStatusChanged', {
                            userId: client.userUuid,
                            userName: client.userName,
                            status: data.status,
                            timestamp: new Date().toISOString()
                        })
                    })
                }
            })

            const duration = Date.now() - startTime
            this.logger.log(`✅ [UPDATE_STATUS] Status updated successfully`)
            this.logger.log(`   ├─ New Status: ${data.status}`)
            this.logger.log(`   └─ Duration: ${duration}ms`)

            return { success: true, status: data.status }
        } catch (error) {
            const duration = Date.now() - startTime
            this.logger.error(`❌ [UPDATE_STATUS] Status update failed`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   ├─ Duration: ${duration}ms`)
            this.logger.error(`   └─ Stack: ${error.stack}`)
            return { success: false, error: error.message }
        }
    }

    // ==================== VOICE/VIDEO CALLS ====================
    @SubscribeMessage('initiateCall')
    async handleInitiateCall(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            recipientId?: string
            groupId?: string
            callType: 'voice' | 'video'
            callId: string
        }
    ) {
        const startTime = Date.now()

        this.logger.log(`📞 [INITIATE_CALL] Initiating call`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ Caller: ${client.userName || 'Unknown'} (${client.userUuid || 'N/A'})`
        )
        this.logger.log(`   ├─ Recipient ID: ${data.recipientId || 'None'}`)
        this.logger.log(`   ├─ Group ID: ${data.groupId || 'None'}`)
        this.logger.log(`   ├─ Call Type: ${data.callType}`)
        this.logger.log(`   └─ Call ID: ${data.callId}`)

        if (!client.userUuid) {
            this.logger.error(`❌ [INITIATE_CALL] Unauthenticated client`)
            return { success: false, error: 'User not authenticated' }
        }

        if (!data.recipientId && !data.groupId) {
            this.logger.error(
                `❌ [INITIATE_CALL] Missing recipient or group ID`
            )
            return {
                success: false,
                error: 'Recipient ID or Group ID is required'
            }
        }

        if (!data.callId) {
            this.logger.error(`❌ [INITIATE_CALL] Missing call ID`)
            return { success: false, error: 'Call ID is required' }
        }

        try {
            const targetRoom = data.recipientId
                ? `user:${data.recipientId}`
                : `group:${data.groupId}`

            // Count potential recipients
            const recipientsCount =
                this.server.sockets.adapter.rooms.get(targetRoom)?.size || 0

            this.logger.log(`📡 [INITIATE_CALL] Sending call invitation`)
            this.logger.log(`   ├─ Target Room: ${targetRoom}`)
            this.logger.log(`   └─ Online Recipients: ${recipientsCount}`)

            this.server.to(targetRoom).emit('incomingCall', {
                callId: data.callId,
                callType: data.callType,
                caller: {
                    uuid: client.userUuid,
                    name: client.userName,
                    avatarUrl: client.userAvatarUrl
                },
                recipientId: data.recipientId,
                groupId: data.groupId,
                timestamp: new Date().toISOString()
            })

            const duration = Date.now() - startTime
            this.logger.log(`✅ [INITIATE_CALL] Call initiated successfully`)
            this.logger.log(`   ├─ Call ID: ${data.callId}`)
            this.logger.log(`   ├─ Recipients Notified: ${recipientsCount}`)
            this.logger.log(`   └─ Duration: ${duration}ms`)

            return { success: true, callId: data.callId }
        } catch (error) {
            const duration = Date.now() - startTime
            this.logger.error(`❌ [INITIATE_CALL] Call initiation failed`)
            this.logger.error(`   ├─ Call ID: ${data.callId}`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   ├─ Duration: ${duration}ms`)
            this.logger.error(`   └─ Stack: ${error.stack}`)
            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('respondToCall')
    async handleRespondToCall(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            callId: string
            response: 'accept' | 'decline'
            callerId: string
        }
    ) {
        const startTime = Date.now()

        this.logger.log(`📞 [RESPOND_CALL] Responding to call`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ Responder: ${client.userName || 'Unknown'} (${client.userUuid || 'N/A'})`
        )
        this.logger.log(`   ├─ Caller ID: ${data.callerId}`)
        this.logger.log(`   ├─ Call ID: ${data.callId}`)
        this.logger.log(`   └─ Response: ${data.response}`)

        if (!client.userUuid) {
            this.logger.error(`❌ [RESPOND_CALL] Unauthenticated client`)
            return { success: false, error: 'User not authenticated' }
        }

        if (!data.callId || !data.callerId) {
            this.logger.error(`❌ [RESPOND_CALL] Missing required data`)
            this.logger.error(`   ├─ Call ID: ${data.callId || 'Missing'}`)
            this.logger.error(`   └─ Caller ID: ${data.callerId || 'Missing'}`)
            return {
                success: false,
                error: 'Call ID and Caller ID are required'
            }
        }

        try {
            const targetRoom = `user:${data.callerId}`
            const callersCount =
                this.server.sockets.adapter.rooms.get(targetRoom)?.size || 0

            this.logger.log(`📡 [RESPOND_CALL] Sending response to caller`)
            this.logger.log(`   ├─ Target Room: ${targetRoom}`)
            this.logger.log(`   └─ Online Callers: ${callersCount}`)

            this.server.to(targetRoom).emit('callResponse', {
                callId: data.callId,
                response: data.response,
                responder: {
                    uuid: client.userUuid,
                    name: client.userName,
                    avatarUrl: client.userAvatarUrl
                },
                timestamp: new Date().toISOString()
            })

            const duration = Date.now() - startTime
            this.logger.log(`✅ [RESPOND_CALL] Call response sent successfully`)
            this.logger.log(`   ├─ Call ID: ${data.callId}`)
            this.logger.log(`   ├─ Response: ${data.response}`)
            this.logger.log(
                `   ├─ Caller Notified: ${callersCount > 0 ? 'Yes' : 'No'}`
            )
            this.logger.log(`   └─ Duration: ${duration}ms`)

            return { success: true }
        } catch (error) {
            const duration = Date.now() - startTime
            this.logger.error(`❌ [RESPOND_CALL] Call response failed`)
            this.logger.error(`   ├─ Call ID: ${data.callId}`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   ├─ Duration: ${duration}ms`)
            this.logger.error(`   └─ Stack: ${error.stack}`)
            return { success: false, error: error.message }
        }
    }

    @SubscribeMessage('endCall')
    async handleEndCall(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody()
        data: {
            callId: string
            participants: string[]
        }
    ) {
        const startTime = Date.now()

        this.logger.log(`📞 [END_CALL] Ending call`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ Ender: ${client.userName || 'Unknown'} (${client.userUuid || 'N/A'})`
        )
        this.logger.log(`   ├─ Call ID: ${data.callId}`)
        this.logger.log(
            `   └─ Participants Count: ${data.participants?.length || 0}`
        )

        if (!client.userUuid) {
            this.logger.error(`❌ [END_CALL] Unauthenticated client`)
            return { success: false, error: 'User not authenticated' }
        }

        if (!data.callId) {
            this.logger.error(`❌ [END_CALL] Missing call ID`)
            return { success: false, error: 'Call ID is required' }
        }

        if (!data.participants || data.participants.length === 0) {
            this.logger.error(`❌ [END_CALL] No participants provided`)
            return { success: false, error: 'Participants list is required' }
        }

        try {
            let notifiedCount = 0

            this.logger.log(`📡 [END_CALL] Notifying participants`)

            // Notify all participants
            data.participants.forEach((participantId) => {
                const targetRoom = `user:${participantId}`
                const participantSockets =
                    this.server.sockets.adapter.rooms.get(targetRoom)?.size || 0

                if (participantSockets > 0) {
                    this.server.to(targetRoom).emit('callEnded', {
                        callId: data.callId,
                        endedBy: {
                            uuid: client.userUuid,
                            name: client.userName
                        },
                        timestamp: new Date().toISOString()
                    })
                    notifiedCount++
                }

                this.logger.log(
                    `   ├─ Participant ${participantId}: ${
                        participantSockets > 0 ? 'Notified' : 'Offline'
                    }`
                )
            })

            const duration = Date.now() - startTime
            this.logger.log(`✅ [END_CALL] Call ended successfully`)
            this.logger.log(`   ├─ Call ID: ${data.callId}`)
            this.logger.log(
                `   ├─ Total Participants: ${data.participants.length}`
            )
            this.logger.log(`   ├─ Notified Participants: ${notifiedCount}`)
            this.logger.log(`   └─ Duration: ${duration}ms`)

            return { success: true, notifiedParticipants: notifiedCount }
        } catch (error) {
            const duration = Date.now() - startTime
            this.logger.error(`❌ [END_CALL] Call end failed`)
            this.logger.error(`   ├─ Call ID: ${data.callId}`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   ├─ Duration: ${duration}ms`)
            this.logger.error(`   └─ Stack: ${error.stack}`)
            return { success: false, error: error.message }
        }
    }

    // ==================== HELPER METHODS ====================
    private async isUserGroupMember(
        userId: string,
        groupId: string
    ): Promise<boolean> {
        try {
            const members = await this.groupService.getGroupMembers(groupId)
            return members.some((member) => member.userId === userId)
        } catch (error) {
            this.logger.error(
                `Error checking group membership: ${error.message}`
            )
            return false
        }
    }

    private async joinUserConversations(client: AuthenticatedSocket) {
        try {
            const conversations =
                await this.conversationService.getUserConversations(
                    client.userUuid
                )
            conversations.forEach((conversation) => {
                client.join(`conversation:${conversation.uuid}`)
            })
        } catch (error) {
            this.logger.error(
                `Error joining user conversations: ${error.message}`
            )
        }
    }

    private async joinUserGroups(client: AuthenticatedSocket) {
        try {
            const groups = await this.groupService.getUserGroups(
                client.userUuid
            )
            groups.forEach((group) => {
                client.join(`group:${group.uuid}`)
            })
        } catch (error) {
            this.logger.error(`Error joining user groups: ${error.message}`)
        }
    }

    private async updateUserStatus(userId: string, status: string) {
        try {
            // Skip database operations for guest users
            if (userId.startsWith('guest_') || userId.startsWith('guest-')) {
                this.logger.debug(
                    `👻 [GUEST_STATUS] Skipping status update for guest user: ${userId}`
                )
                return
            }

            await this.userService.updateStatus(userId, status as any)

            // Notify all friends about status change
            const friends = await this.friendshipService.getFriends(userId)
            friends.forEach((friendship) => {
                const friendUserId = friendship.user.uuid
                this.server
                    .to(`user:${friendUserId}`)
                    .emit('userStatusChanged', {
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

    public emitToConversation(
        conversationId: string,
        event: string,
        data: any
    ) {
        this.server.to(`conversation:${conversationId}`).emit(event, data)
    }

    public getUserSockets(userId: string): AuthenticatedSocket[] {
        return this.authenticatedUsers.get(userId) || []
    }

    public isUserOnline(userId: string): boolean {
        return this.authenticatedUsers.has(userId)
    }
}
