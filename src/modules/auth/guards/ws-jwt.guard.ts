import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(private jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient()
            const data = context.switchToWs().getData()

            // Get token from either the data or handshake auth
            const token =
                data.token ||
                client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.split(' ')[1]

            if (!token) {
                throw new WsException('No token provided')
            }

            const payload = await this.jwtService.verifyAsync(token)

            // Set user data in both places for compatibility
            client['user'] = payload
            client.data = client.data || {}
            client.data.userId = payload.uuid || payload.id
            client.data.userName = payload.name
            client.data.email = payload.email
            client.data.avatarUrl = payload.avatarUrl || payload.avatar

            return true
        } catch (err) {
            throw new WsException('Invalid token')
        }
    }
}
