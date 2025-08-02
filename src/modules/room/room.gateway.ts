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
export class RoomGateway {
    @WebSocketServer()
    server: Server

    constructor(
        private readonly roomService: RoomService,
        private readonly giftService: GiftService
    ) {}

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

    @SubscribeMessage('sendComment')
    async handleSendComment(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: CreateRoomCommentDto & { roomId: string }
    ) {
        const userId = client.data.userId

        try {
            const comment = await this.roomService.addRoomComment(
                data.roomId,
                userId,
                data.message,
                data.messageType || 'text',
                data.replyToId,
                data.metadata
            )

            // Get the latest comment for the room
            const allComments = await this.roomService.getRoomComments(
                data.roomId
            )
            const commentWithUser = allComments[0] // First comment (latest due to DESC order)

            // Emit to all room participants
            this.server.to(`room:${data.roomId}`).emit('newComment', {
                roomId: data.roomId,
                comment: commentWithUser
            })

            return { status: 'success', comment: commentWithUser }
        } catch (error) {
            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('deleteComment')
    async handleDeleteComment(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { commentId: string; roomId: string }
    ) {
        const userId = client.data.userId

        try {
            await this.roomService.deleteRoomComment(data.commentId, userId)

            // Notify all room participants
            this.server.to(`room:${data.roomId}`).emit('commentDeleted', {
                roomId: data.roomId,
                commentId: data.commentId
            })

            return { status: 'success' }
        } catch (error) {
            return { status: 'error', message: error.message }
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
        const userId = client.data.userId

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
                sender: { id: userId },
                receiver: { id: data.receiverId }
            })

            return { status: 'success', transaction }
        } catch (error) {
            return { status: 'error', message: error.message }
        }
    }

    @SubscribeMessage('getRoomComments')
    async handleGetRoomComments(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { roomId: string; limit?: number; offset?: number }
    ) {
        const userId = client.data.userId

        try {
            // Verify user is in the room
            const participant = await this.roomService.getRoomParticipants(
                data.roomId
            )
            const isParticipant = participant.some((p) => p.userId === userId)

            if (!isParticipant) {
                return {
                    status: 'error',
                    message: 'You must be a participant to view comments'
                }
            }

            const result = await this.roomService.getRoomComments(data.roomId)

            return { status: 'success', data: result }
        } catch (error) {
            return { status: 'error', message: error.message }
        }
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
