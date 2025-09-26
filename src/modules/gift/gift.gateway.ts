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
import { GiftService } from './gift.service'

@WebSocketGateway({
    cors: {
        origin: '*'
    },
    namespace: 'gifts'
})
export class GiftGateway {
    @WebSocketServer()
    server: Server

    constructor(private giftService: GiftService) {}

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('sendGift')
    async handleSendGift(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            giftId: string
            receiverId: string[]
            quantity: number
            message?: string
            roomId?: string
        }
    ) {
        const userId = client['user'].uuid

        try {
            const result = await this.giftService.sendGift(
                userId,
                data.receiverId,
                data.giftId,
                data.quantity,
                data.roomId,
                data.message
            )

            // Emit to sender
            client.emit('giftSent', {
                success: true,
                data: result
            })

            // Emit to each receiver
            for (const receiverId of data.receiverId) {
                this.server.to(`user:${receiverId}`).emit('giftReceived', {
                    data: result,
                    receiverId
                })
            }

            // If in a room, emit to the room
            if (data.roomId) {
                this.server.to(`room:${data.roomId}`).emit('roomGift', {
                    data: result
                })
            }

            return { success: true, data: result }
        } catch (error) {
            return {
                success: false,
                message: error.message
            }
        }
    }
}
