import { Logger } from '@nestjs/common'
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

@WebSocketGateway({
    cors: {
        origin: '*'
    }
})
export class RoomRootGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    public server: Server

    private readonly logger = new Logger(RoomRootGateway.name)

    afterInit(server: Server) {
        this.logger.log('🚀 Room Root Gateway initialized successfully')
        this.logger.log(`📡 WebSocket namespace: / (root)`)
        this.logger.log(`🔄 CORS enabled for all origins`)
        this.logger.warn(
            `⚠️ This is a fallback gateway - clients should connect to /rooms namespace`
        )
    }

    handleConnection(client: Socket) {
        this.logger.warn(
            `⚠️ Client connected to ROOT namespace: ${client.id} | ` +
                `Client should connect to /rooms namespace instead`
        )

        // Inform client about correct namespace
        client.emit('namespaceInfo', {
            message:
                'You are connected to the root namespace. For room features, please connect to /rooms namespace',
            correctNamespace: '/rooms',
            currentNamespace: '/'
        })
    }

    handleDisconnect(client: Socket) {
        this.logger.log(
            `🔌 Client disconnected from root namespace: ${client.id}`
        )
    }

    @SubscribeMessage('toggleMute')
    async handleToggleMute(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: any
    ) {
        this.logger.warn(
            `⚠️ toggleMute received on ROOT namespace from ${client.id} | ` +
                `Data: ${JSON.stringify(data)} | ` +
                `Client should use /rooms namespace for room features`
        )

        // Return helpful error message
        return {
            status: 'error',
            message:
                'toggleMute should be sent to /rooms namespace, not root namespace',
            correctNamespace: '/rooms',
            currentNamespace: '/',
            receivedData: data
        }
    }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: any
    ) {
        this.logger.warn(
            `⚠️ joinRoom received on ROOT namespace from ${client.id} | ` +
                `Data: ${JSON.stringify(data)} | ` +
                `Client should use /rooms namespace`
        )

        return {
            status: 'error',
            message:
                'joinRoom should be sent to /rooms namespace, not root namespace',
            correctNamespace: '/rooms',
            currentNamespace: '/'
        }
    }

    // Catch-all for any other room-related events
    @SubscribeMessage('sendComment')
    @SubscribeMessage('leaveRoom')
    @SubscribeMessage('kickUser')
    async handleRoomEvents(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: any
    ) {
        this.logger.warn(
            `⚠️ Room event received on ROOT namespace from ${client.id} | ` +
                `Client should use /rooms namespace for all room features`
        )

        return {
            status: 'error',
            message:
                'Room events should be sent to /rooms namespace, not root namespace',
            correctNamespace: '/rooms',
            currentNamespace: '/'
        }
    }
}
