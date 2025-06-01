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
            receiverId: string
            giftId: string
            roomId?: string
            message?: string
        }
    ) {
        const userId = client['user'].uuid

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
                sender: transaction.sender
            })

            // Emit to receiver
            this.server.to(`user:${data.receiverId}`).emit('giftReceived', {
                transaction: {
                    ...transaction,
                    sender: transaction.sender,
                    receiver: transaction.receiver
                }
            })

            // If in a room, emit to the room
            if (data.roomId) {
                this.server.to(`room:${data.roomId}`).emit('roomGift', {
                    transaction
                })
            }

            return { success: true }
        } catch (error) {
            return {
                success: false,
                message: error.message
            }
        }
    }
}
