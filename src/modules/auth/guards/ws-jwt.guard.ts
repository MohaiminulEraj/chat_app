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

            // Get token from multiple sources to match Flutter implementation
            let token =
                data.token ||
                client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.split(' ')[1]

            // Check if token is in the URL path (Flutter sends it as part of URL)
            if (!token && client.handshake.url) {
                const urlParts = client.handshake.url.split('/')
                // Look for JWT token in URL parts (after the last slash)
                const lastPart = urlParts[urlParts.length - 1]
                if (lastPart && lastPart.startsWith('eyJ')) {
                    token = lastPart
                }
            }

            if (!token) {
                // Allow connection without token for now, will handle in setup event
                console.log(
                    'No token found during connection, allowing for setup event'
                )
                return true
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
            // Allow connection to proceed, handle authentication in setup event
            console.log(
                'JWT verification failed, allowing for setup event:',
                err.message
            )
            return true
        }
    }
}
