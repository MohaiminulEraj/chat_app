import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConversationModule } from '../conversation/conversation.module'
import { FriendshipModule } from '../friendship/friendship.module'
import { GroupModule } from '../group/group.module'
import { UserModule } from '../user/user.module'
import { SocketIOGateway } from './socketio.gateway'
import { SocketIOService } from './socketio.service'

@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'your-secret-key',
            signOptions: { expiresIn: '24h' }
        }),
        UserModule,
        ConversationModule,
        FriendshipModule,
        GroupModule
    ],
    providers: [SocketIOGateway, SocketIOService],
    exports: [SocketIOGateway, SocketIOService]
})
export class SocketIOModule {}
