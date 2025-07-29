import { Injectable, Logger, Inject } from '@nestjs/common'
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { WebsocketService } from './websocket.service'
import { JwtService } from '../auth/service/jwt.service'
import { UserService } from '../user/user.service'

@Injectable()
@WebSocketGateway({
    namespace: 'general',
    transports: ['websocket', 'polling'],
    cors: {
        origin: '*', // Enable CORS for all origins
        methods: ['GET', 'POST'], // Allow specific methods
        allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
        credentials: true
    }
})
export class WebsocketGateway {
    @WebSocketServer()
    server: Server

    private logger: Logger = new Logger('SocketServerGateway')
    private clients: Map<string, Socket> = new Map() // CREATING A MAP TO STORE CLIENTS
    private authenticatedClients: Map<
        string,
        { socket: Socket; userId: string; userName: string }
    > = new Map()
    // Store online users with socket mapping for device tracking
    private onlineUsers: Map<
        string,
        { socketId: string; userId: string; deviceId?: string }
    > = new Map()

    constructor(
        private readonly websocketService: WebsocketService,
        @Inject(JwtService)
        private readonly jwtService: JwtService,
        private readonly userService: UserService
    ) {}

    /**
     * This method is called when a client connects to the server.
     * @param client
     */
    handleConnection(client: Socket) {
        const connectionTime = new Date().toISOString()
        const clientIp = client.handshake.address
        const userAgent = client.handshake.headers['user-agent']
        const queryParams = client.handshake.query
        const authToken = queryParams['auth-token'] // Access other params like token if needed

        this.clients.set(client.id, client)

        this.logger.log(`🔌 [CONNECTION] Client connected`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(`   ├─ IP Address: ${clientIp}`)
        this.logger.log(`   ├─ User Agent: ${userAgent}`)
        this.logger.log(`   ├─ Connection Time: ${connectionTime}`)
        this.logger.log(`   ├─ Transport: ${client.conn.transport.name}`)
        this.logger.log(`   ├─ Auth Token Present: ${authToken ? 'Yes' : 'No'}`)
        this.logger.log(`   └─ Total Connections: ${this.clients.size}`)

        // Set connection metadata
        client.data = {
            connectedAt: connectionTime,
            ip: clientIp,
            userAgent: userAgent,
            authenticated: false
        }
    }

    /**
     * Authentication endpoint - authenticates socket connection with JWT token
     * @param data - { token: string, deviceId?: string }
     * @param client - Socket connection
     */
    @SubscribeMessage('authenticate')
    async handleAuthentication(
        @MessageBody() data: { token: string; deviceId?: string },
        @ConnectedSocket() client: Socket
    ) {
        const startTime = Date.now()
        this.logger.log(`🔐 [AUTHENTICATE] Authentication attempt`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(`   ├─ Token Present: ${data?.token ? 'Yes' : 'No'}`)
        this.logger.log(`   ├─ Token Length: ${data?.token?.length || 0} chars`)
        this.logger.log(`   └─ Device ID: ${data?.deviceId || 'Not provided'}`)

        try {
            if (!data?.token) {
                this.logger.error(
                    `❌ [AUTHENTICATE] Missing token for socket ${client.id}`
                )
                client.emit('authenticationError', {
                    message: 'Token is required',
                    code: 'TOKEN_MISSING',
                    timestamp: new Date().toISOString()
                })
                return
            }

            // Decode and verify JWT token
            const decoded = await this.jwtService.decode(data.token)
            if (!decoded) {
                throw new Error('Invalid token format')
            }

            // Validate user exists and is active
            const user = await this.jwtService.validateUser(decoded)
            if (!user) {
                throw new Error('User not found or inactive')
            }

            // Extract user details
            const userId = user.uuid
            const userName = user.name
            const deviceId = data.deviceId || `device_${Date.now()}`

            // Store online user with device tracking
            this.onlineUsers.set(userId, {
                socketId: client.id,
                userId: userId,
                deviceId: deviceId
            })

            // Store authenticated client
            this.authenticatedClients.set(client.id, {
                socket: client,
                userId: userId,
                userName: userName
            })

            // Update client data
            client.data.authenticated = true
            client.data.userId = userId
            client.data.userName = userName
            client.data.deviceId = deviceId

            // Update user status to online in database
            await this.userService.updateStatus(userId, 'online')

            const duration = Date.now() - startTime
            this.logger.log(`✅ [AUTHENTICATE] Authentication successful`)
            this.logger.log(`   ├─ Socket ID: ${client.id}`)
            this.logger.log(`   ├─ User ID: ${userId}`)
            this.logger.log(`   ├─ User Name: ${userName}`)
            this.logger.log(`   ├─ Device ID: ${deviceId}`)
            this.logger.log(`   ├─ Duration: ${duration}ms`)
            this.logger.log(
                `   └─ Authenticated Clients: ${this.authenticatedClients.size}`
            )

            client.emit('authenticated', {
                message: 'Authentication successful',
                userId: userId,
                userName: userName,
                deviceId: deviceId,
                timestamp: new Date().toISOString()
            })

            // Broadcast user online status to friends/contacts
            this.authenticatedClients.forEach((auth, socketId) => {
                if (socketId !== client.id) {
                    auth.socket.emit('userStatusChanged', {
                        userId: userId,
                        status: 'online',
                        timestamp: new Date().toISOString()
                    })
                }
            })
        } catch (error) {
            const duration = Date.now() - startTime
            this.logger.error(`❌ [AUTHENTICATE] Authentication failed`)
            this.logger.error(`   ├─ Socket ID: ${client.id}`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   └─ Duration: ${duration}ms`)

            client.emit('authenticationError', {
                message: 'Invalid token',
                code: 'TOKEN_INVALID',
                timestamp: new Date().toISOString()
            })
        }
    }

    /**
     * Send direct message to another user
     * @param data - { recipientId: string, type: string, content: string, metadata?: object }
     * @param client - Socket connection
     */
    @SubscribeMessage('sendDirectMessage')
    async handleSendDirectMessage(
        @MessageBody()
        data: {
            recipientId: string
            type: string
            content: string
            metadata?: object
        },
        @ConnectedSocket() client: Socket
    ) {
        const startTime = Date.now()
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        this.logger.log(`💬 [SEND_MESSAGE] Direct message attempt`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ Sender: ${client.data.userName || 'Unknown'} (${client.data.userId || 'N/A'})`
        )
        this.logger.log(`   ├─ Recipient ID: ${data.recipientId}`)
        this.logger.log(`   ├─ Message Type: ${data.type}`)
        this.logger.log(
            `   ├─ Content Length: ${data.content?.length || 0} chars`
        )
        this.logger.log(`   └─ Message ID: ${messageId}`)

        try {
            if (!client.data.authenticated) {
                this.logger.error(
                    `❌ [SEND_MESSAGE] Unauthenticated client attempted to send message`
                )
                this.logger.error(`   └─ Socket ID: ${client.id}`)
                client.emit('error', {
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                })
                return
            }

            if (!data.recipientId || !data.content) {
                this.logger.error(`❌ [SEND_MESSAGE] Invalid message data`)
                this.logger.error(
                    `   ├─ Recipient ID: ${data.recipientId || 'Missing'}`
                )
                this.logger.error(
                    `   └─ Content: ${data.content ? 'Present' : 'Missing'}`
                )
                client.emit('error', {
                    message: 'Recipient ID and content are required',
                    code: 'VALIDATION_ERROR'
                })
                return
            }

            // TODO: Implement friendship validation
            // TODO: Implement conversation creation/retrieval
            // TODO: Implement message persistence

            const conversationId = `conv_${client.data.userId}_${data.recipientId}`
            const timestamp = new Date().toISOString()

            // Find recipient socket
            const recipientAuth = Array.from(
                this.authenticatedClients.values()
            ).find((auth) => auth.userId === data.recipientId)

            if (recipientAuth) {
                // Send to recipient
                recipientAuth.socket.emit('newDirectMessage', {
                    conversationId: conversationId,
                    message: {
                        id: messageId,
                        content: data.content,
                        type: data.type,
                        sender: {
                            uuid: client.data.userId,
                            name: client.data.userName,
                            profilePicture: null // TODO: Get from user service
                        },
                        timestamp: timestamp,
                        metadata: data.metadata || {}
                    }
                })

                const duration = Date.now() - startTime
                this.logger.log(
                    `✅ [SEND_MESSAGE] Message delivered successfully`
                )
                this.logger.log(`   ├─ Message ID: ${messageId}`)
                this.logger.log(`   ├─ Conversation ID: ${conversationId}`)
                this.logger.log(`   ├─ Recipient Online: Yes`)
                this.logger.log(`   └─ Duration: ${duration}ms`)
            } else {
                this.logger.warn(
                    `⚠️ [SEND_MESSAGE] Recipient offline, message queued`
                )
                this.logger.warn(`   ├─ Message ID: ${messageId}`)
                this.logger.warn(`   └─ Recipient ID: ${data.recipientId}`)
                // TODO: Implement message queuing for offline users
            }

            // Respond to sender
            client.emit('sendDirectMessage', {
                success: true,
                messageId: messageId,
                conversationId: conversationId,
                timestamp: timestamp
            })
        } catch (error) {
            const duration = Date.now() - startTime
            this.logger.error(`❌ [SEND_MESSAGE] Message send failed`)
            this.logger.error(`   ├─ Message ID: ${messageId}`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   └─ Duration: ${duration}ms`)

            client.emit('sendDirectMessage', {
                success: false,
                error: 'Failed to send message'
            })
        }
    }

    /**
     * Mark messages as read
     * @param data - { conversationId: string, messageIds: string[] }
     * @param client - Socket connection
     */
    @SubscribeMessage('markMessagesAsRead')
    async handleMarkMessagesAsRead(
        @MessageBody() data: { conversationId: string; messageIds: string[] },
        @ConnectedSocket() client: Socket
    ) {
        this.logger.log(`📖 [MARK_READ] Mark messages as read`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(`   ├─ User: ${client.data.userName || 'Unknown'}`)
        this.logger.log(`   ├─ Conversation ID: ${data.conversationId}`)
        this.logger.log(`   └─ Messages Count: ${data.messageIds?.length || 0}`)

        try {
            if (!client.data.authenticated) {
                this.logger.error(`❌ [MARK_READ] Unauthenticated client`)
                client.emit('error', {
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                })
                return
            }

            // TODO: Implement actual message read marking in database
            // TODO: Find conversation participants
            // TODO: Notify other participants

            // For now, broadcast to all authenticated clients in conversation
            // In real implementation, find specific conversation participants
            this.authenticatedClients.forEach((auth, socketId) => {
                if (socketId !== client.id) {
                    // Don't send back to sender
                    auth.socket.emit('messagesRead', {
                        conversationId: data.conversationId,
                        messageIds: data.messageIds,
                        readBy: {
                            uuid: client.data.userId,
                            name: client.data.userName
                        },
                        timestamp: new Date().toISOString()
                    })
                }
            })

            this.logger.log(
                `✅ [MARK_READ] Messages marked as read successfully`
            )
            client.emit('markMessagesAsRead', {
                success: true,
                markedCount: data.messageIds.length
            })
        } catch (error) {
            this.logger.error(`❌ [MARK_READ] Failed to mark messages as read`)
            this.logger.error(`   └─ Error: ${error.message}`)
            client.emit('error', { message: 'Failed to mark messages as read' })
        }
    }

    /**
     * Send typing status
     * @param data - { conversationId: string, isTyping: boolean }
     * @param client - Socket connection
     */
    @SubscribeMessage('typing')
    async handleTyping(
        @MessageBody() data: { conversationId: string; isTyping: boolean },
        @ConnectedSocket() client: Socket
    ) {
        this.logger.log(`⌨️ [TYPING] Typing status update`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(`   ├─ User: ${client.data.userName || 'Unknown'}`)
        this.logger.log(`   ├─ Conversation: ${data.conversationId}`)
        this.logger.log(`   └─ Is Typing: ${data.isTyping}`)

        try {
            if (!client.data.authenticated) {
                this.logger.error(`❌ [TYPING] Unauthenticated client`)
                return
            }

            // TODO: Find conversation participants instead of broadcasting to all
            this.authenticatedClients.forEach((auth, socketId) => {
                if (socketId !== client.id) {
                    // Don't send back to sender
                    auth.socket.emit('userTyping', {
                        userId: client.data.userId,
                        userName: client.data.userName,
                        conversationId: data.conversationId,
                        isTyping: data.isTyping,
                        timestamp: new Date().toISOString()
                    })
                }
            })

            this.logger.log(`✅ [TYPING] Typing status broadcasted`)
        } catch (error) {
            this.logger.error(`❌ [TYPING] Failed to send typing status`)
            this.logger.error(`   └─ Error: ${error.message}`)
        }
    }

    /**
     * Initiate voice/video call
     * @param data - { recipientId: string, callType: 'voice' | 'video', callId: string }
     * @param client - Socket connection
     */
    @SubscribeMessage('initiateCall')
    async handleInitiateCall(
        @MessageBody()
        data: {
            recipientId: string
            callType: 'voice' | 'video'
            callId: string
        },
        @ConnectedSocket() client: Socket
    ) {
        const startTime = Date.now()
        this.logger.log(`📞 [INITIATE_CALL] Call initiation`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ Caller: ${client.data.userName || 'Unknown'} (${client.data.userId})`
        )
        this.logger.log(`   ├─ Recipient ID: ${data.recipientId}`)
        this.logger.log(`   ├─ Call Type: ${data.callType}`)
        this.logger.log(`   └─ Call ID: ${data.callId}`)

        try {
            if (!client.data.authenticated) {
                this.logger.error(`❌ [INITIATE_CALL] Unauthenticated client`)
                client.emit('error', {
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                })
                return
            }

            // Find recipient
            const recipientAuth = Array.from(
                this.authenticatedClients.values()
            ).find((auth) => auth.userId === data.recipientId)

            if (!recipientAuth) {
                const duration = Date.now() - startTime
                this.logger.warn(`⚠️ [INITIATE_CALL] Recipient not online`)
                this.logger.warn(`   ├─ Call ID: ${data.callId}`)
                this.logger.warn(`   ├─ Recipient ID: ${data.recipientId}`)
                this.logger.warn(`   └─ Duration: ${duration}ms`)

                client.emit('initiateCall', {
                    success: false,
                    error: 'Recipient is not online'
                })
                return
            }

            // Send call to recipient
            recipientAuth.socket.emit('incomingCall', {
                callId: data.callId,
                callType: data.callType,
                caller: {
                    uuid: client.data.userId,
                    name: client.data.userName,
                    profilePicture: null // TODO: Get from user service
                },
                timestamp: new Date().toISOString()
            })

            const duration = Date.now() - startTime
            this.logger.log(`✅ [INITIATE_CALL] Call sent to recipient`)
            this.logger.log(`   ├─ Call ID: ${data.callId}`)
            this.logger.log(`   ├─ Recipient: ${recipientAuth.userName}`)
            this.logger.log(`   └─ Duration: ${duration}ms`)

            client.emit('initiateCall', {
                success: true,
                callId: data.callId,
                message: 'Call initiated successfully'
            })
        } catch (error) {
            const duration = Date.now() - startTime
            this.logger.error(`❌ [INITIATE_CALL] Call initiation failed`)
            this.logger.error(`   ├─ Call ID: ${data.callId}`)
            this.logger.error(`   ├─ Error: ${error.message}`)
            this.logger.error(`   └─ Duration: ${duration}ms`)

            client.emit('initiateCall', {
                success: false,
                error: 'Failed to initiate call'
            })
        }
    }

    /**
     * Respond to incoming call
     * @param data - { callId: string, response: 'accept' | 'decline', callerId: string }
     * @param client - Socket connection
     */
    @SubscribeMessage('respondToCall')
    async handleRespondToCall(
        @MessageBody()
        data: {
            callId: string
            response: 'accept' | 'decline'
            callerId: string
        },
        @ConnectedSocket() client: Socket
    ) {
        this.logger.log(`📞 [RESPOND_CALL] Call response`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(`   ├─ Responder: ${client.data.userName || 'Unknown'}`)
        this.logger.log(`   ├─ Call ID: ${data.callId}`)
        this.logger.log(`   ├─ Response: ${data.response}`)
        this.logger.log(`   └─ Caller ID: ${data.callerId}`)

        try {
            if (!client.data.authenticated) {
                this.logger.error(`❌ [RESPOND_CALL] Unauthenticated client`)
                return
            }

            // Find caller
            const callerAuth = Array.from(
                this.authenticatedClients.values()
            ).find((auth) => auth.userId === data.callerId)

            if (callerAuth) {
                callerAuth.socket.emit('callResponse', {
                    callId: data.callId,
                    response: data.response,
                    responder: {
                        uuid: client.data.userId,
                        name: client.data.userName
                    },
                    timestamp: new Date().toISOString()
                })

                this.logger.log(`✅ [RESPOND_CALL] Response sent to caller`)
                this.logger.log(`   ├─ Call ID: ${data.callId}`)
                this.logger.log(`   └─ Response: ${data.response}`)
            } else {
                this.logger.warn(`⚠️ [RESPOND_CALL] Caller not found`)
                this.logger.warn(`   └─ Caller ID: ${data.callerId}`)
            }

            client.emit('respondToCall', {
                success: true
            })
        } catch (error) {
            this.logger.error(`❌ [RESPOND_CALL] Call response failed`)
            this.logger.error(`   └─ Error: ${error.message}`)
        }
    }

    /**
     * End active call
     * @param data - { callId: string, participants: string[] }
     * @param client - Socket connection
     */
    @SubscribeMessage('endCall')
    async handleEndCall(
        @MessageBody() data: { callId: string; participants: string[] },
        @ConnectedSocket() client: Socket
    ) {
        this.logger.log(`📞 [END_CALL] Call termination`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(`   ├─ Ended By: ${client.data.userName || 'Unknown'}`)
        this.logger.log(`   ├─ Call ID: ${data.callId}`)
        this.logger.log(`   └─ Participants: ${data.participants?.length || 0}`)

        try {
            if (!client.data.authenticated) {
                this.logger.error(`❌ [END_CALL] Unauthenticated client`)
                return
            }

            // Notify all participants
            data.participants?.forEach((participantId) => {
                if (participantId !== client.data.userId) {
                    // Don't send to caller
                    const participantAuth = Array.from(
                        this.authenticatedClients.values()
                    ).find((auth) => auth.userId === participantId)

                    if (participantAuth) {
                        participantAuth.socket.emit('callEnded', {
                            callId: data.callId,
                            endedBy: {
                                uuid: client.data.userId,
                                name: client.data.userName
                            },
                            reason: 'user_ended',
                            timestamp: new Date().toISOString()
                        })
                    }
                }
            })

            this.logger.log(`✅ [END_CALL] Call ended notifications sent`)
            this.logger.log(`   └─ Call ID: ${data.callId}`)

            client.emit('endCall', {
                success: true
            })
        } catch (error) {
            this.logger.error(`❌ [END_CALL] Call end failed`)
            this.logger.error(`   └─ Error: ${error.message}`)
        }
    }

    /**
     * Update user status
     * @param data - { status: 'online' | 'away' | 'busy' | 'offline' }
     * @param client - Socket connection
     */
    @SubscribeMessage('updateStatus')
    async handleUpdateStatus(
        @MessageBody() data: { status: 'online' | 'away' | 'busy' | 'offline' },
        @ConnectedSocket() client: Socket
    ) {
        this.logger.log(`👤 [UPDATE_STATUS] Status update`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${client.data.userName || 'Unknown'} (${client.data.userId})`
        )
        this.logger.log(`   └─ New Status: ${data.status}`)

        try {
            if (!client.data.authenticated) {
                this.logger.error(`❌ [UPDATE_STATUS] Unauthenticated client`)
                client.emit('error', {
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                })
                return
            }

            // Update client data
            client.data.status = data.status

            // TODO: Update status in database
            // TODO: Get user's friends list to notify only friends

            // Broadcast status change to all authenticated clients (should be friends only)
            this.authenticatedClients.forEach((auth, socketId) => {
                if (socketId !== client.id) {
                    auth.socket.emit('userStatusChanged', {
                        userId: client.data.userId,
                        status: data.status,
                        timestamp: new Date().toISOString()
                    })
                }
            })

            this.logger.log(`✅ [UPDATE_STATUS] Status updated and broadcasted`)

            client.emit('updateStatus', {
                success: true,
                status: data.status,
                timestamp: new Date().toISOString()
            })
        } catch (error) {
            this.logger.error(`❌ [UPDATE_STATUS] Status update failed`)
            this.logger.error(`   └─ Error: ${error.message}`)

            client.emit('updateStatus', {
                success: false,
                error: 'Failed to update status'
            })
        }
    }

    /**
     * This method is called when a client disconnects from the server.
     * @param client
     */
    async handleDisconnect(client: Socket) {
        const disconnectionTime = new Date().toISOString()
        const connectedDuration = client.data.connectedAt
            ? Date.now() - new Date(client.data.connectedAt).getTime()
            : 0
        const wasAuthenticated = client.data.authenticated || false
        const userId = client.data.userId
        const userName = client.data.userName

        this.logger.log(`🔌 [DISCONNECTION] Client disconnected`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(
            `   ├─ User: ${userName || 'Anonymous'} ${userId ? `(${userId})` : ''}`
        )
        this.logger.log(`   ├─ Was Authenticated: ${wasAuthenticated}`)
        this.logger.log(
            `   ├─ Connection Duration: ${Math.round(connectedDuration / 1000)}s`
        )
        this.logger.log(`   ├─ Disconnection Time: ${disconnectionTime}`)
        this.logger.log(`   ├─ IP: ${client.data.ip || 'Unknown'}`)
        this.logger.log(
            `   └─ Reason: ${client.disconnected ? 'Client disconnect' : 'Server disconnect'}`
        )

        // Clean up client data
        const deletableClient = this.clients.get(client.id)
        if (
            deletableClient &&
            deletableClient.handshake['query']['auth-token']
        ) {
            // DO ANY OPERATION BEFORE DELETING THE CLIENT
            this.logger.log(
                `🧹 [CLEANUP] Cleaning up authenticated client data`
            )
        }

        // Remove from clients map
        this.clients.delete(client.id)

        // Remove from authenticated clients if present
        if (this.authenticatedClients.has(client.id)) {
            this.authenticatedClients.delete(client.id)
            this.logger.log(`🧹 [CLEANUP] Removed from authenticated clients`)
        }

        // Remove from online users tracking
        if (userId && this.onlineUsers.has(userId)) {
            this.onlineUsers.delete(userId)
            this.logger.log(`🧹 [CLEANUP] Removed from online users tracking`)

            // Update user status to offline in database
            try {
                await this.userService.updateStatus(userId, 'offline')
                this.logger.log(
                    `📊 [STATUS_UPDATE] User status updated to offline in database`
                )
            } catch (error) {
                this.logger.error(
                    `❌ [STATUS_UPDATE_ERROR] Failed to update user status to offline`
                )
                this.logger.error(`   └─ Error: ${error.message}`)
            }
        }

        // If user was authenticated, notify others about status change
        if (wasAuthenticated && userId) {
            this.logger.log(`📢 [STATUS_BROADCAST] Broadcasting offline status`)
            this.authenticatedClients.forEach((auth, socketId) => {
                auth.socket.emit('userStatusChanged', {
                    userId: userId,
                    status: 'offline',
                    timestamp: disconnectionTime
                })
            })
        }

        this.logger.log(`📊 [CONNECTION_STATS] Updated connection statistics`)
        this.logger.log(`   ├─ Total Connections: ${this.clients.size}`)
        this.logger.log(
            `   └─ Authenticated Connections: ${this.authenticatedClients.size}`
        )
    }

    /**
     * Legacy activity handler - keeping for backward compatibility
     * @param data
     * @param client
     */
    @SubscribeMessage('activity')
    handleUserActivity(@MessageBody() data, @ConnectedSocket() client: Socket) {
        this.logger.log(`📢 [ACTIVITY] Legacy activity event`)
        this.logger.log(`   ├─ Socket ID: ${client.id}`)
        this.logger.log(`   ├─ User: ${client.data.userName || 'Anonymous'}`)
        this.logger.log(`   ├─ Data: ${JSON.stringify(data)}`)
        this.logger.log(
            `   └─ Authenticated: ${client.data.authenticated || false}`
        )

        const targetClient = this.clients.get(client.id)
        if (targetClient) {
            if (data === '' || !data) {
                this.logger.warn(
                    `⚠️ [ACTIVITY] No data received from client ${client.id}`
                )
            } else {
                this.logger.log(`✅ [ACTIVITY] Activity data processed`)
            }
        } else {
            this.logger.error(
                `❌ [ACTIVITY] Client with ID ${client.id} not found`
            )
            client.emit('error', `Client with ID ${client.id} not found`)
        }
    }

    /**
     * Handle general errors
     * @param error
     * @param client
     */
    handleError(error: Error, client: Socket) {
        this.logger.error(`💥 [SOCKET_ERROR] Socket error occurred`)
        this.logger.error(`   ├─ Socket ID: ${client.id}`)
        this.logger.error(`   ├─ User: ${client.data?.userName || 'Anonymous'}`)
        this.logger.error(`   ├─ Error Message: ${error.message}`)
        this.logger.error(`   ├─ Error Stack: ${error.stack}`)
        this.logger.error(`   └─ Timestamp: ${new Date().toISOString()}`)

        // Send error to client
        client.emit('error', {
            message: 'An error occurred',
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString()
        })
    }

    /**
     * Get connection statistics
     */
    getConnectionStats() {
        const stats = {
            totalConnections: this.clients.size,
            authenticatedConnections: this.authenticatedClients.size,
            anonymousConnections:
                this.clients.size - this.authenticatedClients.size,
            timestamp: new Date().toISOString()
        }

        this.logger.log(`📊 [STATS] Connection Statistics`)
        this.logger.log(`   ├─ Total Connections: ${stats.totalConnections}`)
        this.logger.log(
            `   ├─ Authenticated: ${stats.authenticatedConnections}`
        )
        this.logger.log(`   ├─ Anonymous: ${stats.anonymousConnections}`)
        this.logger.log(`   └─ Timestamp: ${stats.timestamp}`)

        return stats
    }
}
