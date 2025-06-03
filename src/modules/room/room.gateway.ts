import { UseGuards } from '@nestjs/common'
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard'
import { RoomService } from './room.service'

@WebSocketGateway({
    namespace: 'rooms',
    cors: {
        origin: '*'
    }
})
@UseGuards(WsJwtGuard)
export class RoomGateway {
    @WebSocketServer()
    server: Server

    constructor(private readonly roomService: RoomService) {}

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string }
    ) {
        const userId = client.data.userId

        try {
            const participant = await this.roomService.joinRoom(
                data.roomId,
                userId
            )

            client.join(`room:${data.roomId}`)

            // Notify all room participants
            this.server.to(`room:${data.roomId}`).emit('userJoined', {
                roomId: data.roomId,
                participant
            })

            return { status: 'success', participant }
        } catch (error) {
            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('leaveRoom')
    async handleLeaveRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() roomId: string
    ) {
        const userId = client.data.userId

        await this.roomService.leaveRoom(roomId, userId)

        client.leave(`room:${roomId}`)

        // Notify all room participants
        this.server.to(`room:${roomId}`).emit('userLeft', {
            roomId,
            userId
        })

        return { status: 'success' }
    }

    @SubscribeMessage('toggleMute')
    async handleToggleMute(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; isMuted: boolean }
    ) {
        const userId = client.data.userId

        await this.roomService.updateParticipantStatus(data.roomId, userId, {
            isMuted: data.isMuted
        })

        this.server.to(`room:${data.roomId}`).emit('participantStatusUpdate', {
            roomId: data.roomId,
            userId,
            status: { isMuted: data.isMuted }
        })

        return { status: 'success' }
    }

    @SubscribeMessage('toggleDeafen')
    async handleToggleDeafen(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; isDeafened: boolean }
    ) {
        const userId = client.data.userId

        await this.roomService.updateParticipantStatus(data.roomId, userId, {
            isDeafened: data.isDeafened
        })

        this.server.to(`room:${data.roomId}`).emit('participantStatusUpdate', {
            roomId: data.roomId,
            userId,
            status: { isDeafened: data.isDeafened }
        })

        return { status: 'success' }
    }

    @SubscribeMessage('toggleVideo')
    async handleToggleVideo(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; isVideoOn: boolean }
    ) {
        const userId = client.data.userId

        await this.roomService.updateParticipantStatus(data.roomId, userId, {
            isVideoOn: data.isVideoOn
        })

        this.server.to(`room:${data.roomId}`).emit('participantStatusUpdate', {
            roomId: data.roomId,
            userId,
            status: { isVideoOn: data.isVideoOn }
        })

        return { status: 'success' }
    }

    @SubscribeMessage('updateSpeaking')
    async handleUpdateSpeaking(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; isSpeaking: boolean }
    ) {
        const userId = client.data.userId

        await this.roomService.updateParticipantStatus(data.roomId, userId, {
            isSpeaking: data.isSpeaking
        })

        client.to(`room:${data.roomId}`).emit('participantStatusUpdate', {
            roomId: data.roomId,
            userId,
            status: { isSpeaking: data.isSpeaking }
        })

        return { status: 'success' }
    }
}
