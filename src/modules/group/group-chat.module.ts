import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { UserModule } from '../user/user.module'
import { GroupChatController } from './group-chat.controller'
import { GroupChatGateway } from './group-chat.gateway'
import { GroupChatService } from './group-chat.service'
import { GroupMember } from './entities/group-member.entity'
import { Group } from './entities/group.entity'
import {
    GroupMessage,
    GroupMessageSchema
} from './schemas/group-message.schema'

@Module({
    imports: [
        TypeOrmModule.forFeature([Group, GroupMember]),
        MongooseModule.forFeature([
            { name: GroupMessage.name, schema: GroupMessageSchema }
        ]),
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
