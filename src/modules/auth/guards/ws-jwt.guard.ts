import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(private jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient<Socket>()
            const authToken = this.extractTokenFromHandshake(client)

            if (!authToken) {
                throw new WsException('Unauthorized')
            }

            const payload = await this.jwtService.verifyAsync(authToken)
            client.data.userId = payload.sub
            client.data.user = payload

            return true
        } catch (err) {
            throw new WsException('Unauthorized')
        }
    }

    private extractTokenFromHandshake(client: Socket): string | undefined {
        const token =
            client.handshake.auth?.token ||
            client.handshake.headers?.authorization

        if (token && token.startsWith('Bearer ')) {
            return token.substring(7)
        }

        return token
    }
}
