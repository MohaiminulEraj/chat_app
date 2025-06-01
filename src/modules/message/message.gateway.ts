import { UseGuards } from '@nestjs/common'
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard'
import { CreateMessageDto } from './dto/create-message.dto'
import { MessageService } from './message.service'

@WebSocketGateway({
    cors: {
        origin: '*'
    }
})
@UseGuards(WsJwtGuard)
export class MessageGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server

    constructor(private readonly messageService: MessageService) {}

    async handleConnection(client: Socket) {
        const userId = client.data.userId
        if (userId) {
            // Join user's personal room
            client.join(`user:${userId}`)

            // Join conversation rooms
            const conversations =
                await this.messageService.getUserConversations(userId)
            conversations.forEach((conv) => {
                client.join(`conversation:${conv.id}`)
            })

            // Update user status
            this.server.emit('userStatusUpdate', { userId, status: 'online' })
        }
    }

    async handleDisconnect(client: Socket) {
        const userId = client.data.userId
        if (userId) {
            this.server.emit('userStatusUpdate', { userId, status: 'offline' })
        }
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() createMessageDto: CreateMessageDto
    ) {
        const userId = client.data.userId
        const message = await this.messageService.createMessage(
            userId,
            createMessageDto
        )

        // Emit to all participants in the conversation
        this.server
            .to(`conversation:${message.conversationId}`)
            .emit('newMessage', message)

        return message
    }

    @SubscribeMessage('typing')
    handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string; isTyping: boolean }
    ) {
        const userId = client.data.userId
        client.to(`conversation:${data.conversationId}`).emit('userTyping', {
            userId,
            conversationId: data.conversationId,
            isTyping: data.isTyping
        })
    }

    @SubscribeMessage('markAsRead')
    async handleMarkAsRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { messageIds: string[] }
    ) {
        const userId = client.data.userId
        await this.messageService.markMessagesAsRead(userId, data.messageIds)

        // Notify sender about read receipt
        data.messageIds.forEach((messageId) => {
            this.server.emit('messageRead', { messageId, userId })
        })
    }

    @SubscribeMessage('joinConversation')
    async handleJoinConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() conversationId: string
    ) {
        client.join(`conversation:${conversationId}`)
        return { status: 'joined', conversationId }
    }

    @SubscribeMessage('leaveConversation')
    handleLeaveConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() conversationId: string
    ) {
        client.leave(`conversation:${conversationId}`)
        return { status: 'left', conversationId }
    }
}
