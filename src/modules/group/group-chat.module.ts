import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { UserModule } from '../user/user.module'
import { GroupChatController } from './group-chat.controller'
import { GroupChatGateway } from './group-chat.gateway'
import { GroupChatService } from './group-chat.service'
import { GroupMember } from './entities/group-member.entity'
import { Group } from './entities/group.entity'
import { GroupMessage } from './entities/group-message.entity'

@Module({
    imports: [
        TypeOrmModule.forFeature([Group, GroupMember, GroupMessage]),
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'your-secret-key',
            signOptions: { expiresIn: '1d' }
        }),
        UserModule,
        AuthModule
    ],
    controllers: [GroupChatController],
    providers: [GroupChatGateway, GroupChatService],
    exports: [GroupChatService]
})
export class GroupChatModule {}
