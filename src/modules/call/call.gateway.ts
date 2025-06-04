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
import { ConversationService } from '../conversation/conversation.service'
import { CallType, MessageType } from '../conversation/schemas/message.schema'

@WebSocketGateway({
    cors: {
        origin: '*'
    },
    namespace: 'call'
})
export class CallGateway {
    @WebSocketServer()
    server: Server

    constructor(private conversationService: ConversationService) {}

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('initiateCall')
    async handleInitiateCall(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            recipientId: string
            callType: CallType
            conversationId?: string
        }
    ) {
        const callerId = client['user'].uuid

        try {
            // Get or create conversation
            const conversation = data.conversationId
                ? await this.conversationService.getConversation(
                      data.conversationId
                  )
                : await this.conversationService.getOrCreateDirectConversation(
                      callerId,
                      data.recipientId
                  )

            // Create call message
            const callMessage = await this.conversationService.createMessage({
                conversationId: conversation.uuid,
                senderId: callerId,
                type: MessageType.CALL,
                content: `${data.callType} call`
            })

            const callRoom = `call:${callMessage._id}`
            client.join(callRoom)

            // Notify recipient
            this.server.to(`user:${data.recipientId}`).emit('incomingCall', {
                callId: callMessage._id,
                callerId,
                callerName: client['user'].displayName,
                callType: data.callType,
                conversationId: conversation.uuid
            })

            return {
                success: true,
                callId: callMessage._id,
                conversationId: conversation.uuid
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('acceptCall')
    async handleAcceptCall(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            callId: string
        }
    ) {
        const userId = client['user'].uuid
        const callRoom = `call:${data.callId}`

        client.join(callRoom)

        // Notify caller that call was accepted
        client.to(callRoom).emit('callAccepted', {
            callId: data.callId,
            acceptedBy: userId
        })

        return { success: true }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('rejectCall')
    async handleRejectCall(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            callId: string
        }
    ) {
        const userId = client['user'].uuid
        const callRoom = `call:${data.callId}`

        // Notify caller that call was rejected
        this.server.to(callRoom).emit('callRejected', {
            callId: data.callId,
            rejectedBy: userId
        })

        return { success: true }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('endCall')
    async handleEndCall(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            callId: string
            duration?: number
        }
    ) {
        const userId = client['user'].uuid
        const callRoom = `call:${data.callId}`

        // Notify all participants
        this.server.to(callRoom).emit('callEnded', {
            callId: data.callId,
            endedBy: userId,
            duration: data.duration
        })

        // Leave the call room
        client.leave(callRoom)

        // TODO: Update call message with duration

        return { success: true }
    }

    // WebRTC Signaling
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('offer')
    async handleOffer(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            callId: string
            offer: RTCSessionDescriptionInit
            to: string
        }
    ) {
        this.server.to(`user:${data.to}`).emit('offer', {
            callId: data.callId,
            offer: data.offer,
            from: client['user'].uuid
        })

        return { success: true }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('answer')
    async handleAnswer(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            callId: string
            answer: RTCSessionDescriptionInit
            to: string
        }
    ) {
        this.server.to(`user:${data.to}`).emit('answer', {
            callId: data.callId,
            answer: data.answer,
            from: client['user'].uuid
        })

        return { success: true }
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('iceCandidate')
    async handleIceCandidate(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: {
            callId: string
            candidate: RTCIceCandidateInit
            to: string
        }
    ) {
        this.server.to(`user:${data.to}`).emit('iceCandidate', {
            callId: data.callId,
            candidate: data.candidate,
            from: client['user'].uuid
        })

        return { success: true }
    }
}
