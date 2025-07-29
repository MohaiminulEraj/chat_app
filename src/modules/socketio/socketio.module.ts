import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { ConversationModule } from '../conversation/conversation.module'
import { FriendshipModule } from '../friendship/friendship.module'
import { GroupModule } from '../group/group.module'
import { UserModule } from '../user/user.module'
import { SocketIOGateway } from './socketio.gateway'
import { SocketIOService } from './socketio.service'

@Module({
    imports: [
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const secret =
                    configService.get<string>('jwt.secret') ||
                    configService.get<string>('JWT_SECRET')
                console.log(
                    '🔐 [SocketIO Module] Configuring JWT with secret length:',
                    secret?.length || 0
                )
                console.log(
                    '🔐 [SocketIO Module] JWT Secret first 4 chars:',
                    secret?.substring(0, 4) + '...'
                )

                if (!secret || secret === 'your-jwt-secret-here') {
                    console.error(
                        '⚠️  [SocketIO Module] WARNING: Using default JWT secret. Please set JWT_SECRET in .env file!'
                    )
                }

                return {
                    secret: secret,
                    signOptions: {
                        expiresIn:
                            configService.get<string>('jwt.expiresIn') ||
                            configService.get<string>('JWT_EXPIRES_IN', '7d')
                    }
                }
            }
        }),
        UserModule,
        ConversationModule,
        FriendshipModule,
        GroupModule
    ],
    providers: [SocketIOGateway, SocketIOService, ConfigService],
    exports: [SocketIOGateway, SocketIOService]
})
export class SocketIOModule {}
