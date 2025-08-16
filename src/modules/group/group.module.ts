import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { MongooseModule } from '@nestjs/mongoose'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'
import { User } from '../user/entities/user.entity'
import { UserModule } from '../user/user.module'
import { GroupChatController } from './group-chat.controller'
import { GroupChatGateway } from './group-chat.gateway'
import { GroupChatService } from './group-chat.service'
import { GroupController } from './group.controller'
import { GroupService } from './group.service'
import { GroupMember } from './entities/group-member.entity'
import { GroupRole } from './entities/group-role.entity'
import { GroupSettings } from './entities/group-settings.entity'
import { Group } from './entities/group.entity'
import {
    GroupMessage,
    GroupMessageSchema
} from './schemas/group-message.schema'

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Group,
            GroupMember,
            GroupRole,
            GroupSettings,
            User
        ]),
        MongooseModule.forFeature([
            { name: GroupMessage.name, schema: GroupMessageSchema }
        ]),
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'your-secret-key',
            signOptions: { expiresIn: '1d' }
        }),
        UserModule,
        CloudinaryModule,
        AuthModule
    ],
    controllers: [GroupController, GroupChatController],
    providers: [GroupService, GroupChatService, GroupChatGateway],
    exports: [GroupService, GroupChatService]
})
export class GroupModule {}
