import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'
import { Room } from '../room/entities/room.entity'
import { GroupMember } from './entities/group-member.entity'
import { GroupRole } from './entities/group-role.entity'
import { GroupSettings } from './entities/group-settings.entity'
import { Group } from './entities/group.entity'
import { GroupChatController } from './group-chat.controller'
import { GroupChatGateway } from './group-chat.gateway'
import { GroupChatService } from './group-chat.service'
import { GroupController } from './group.controller'
import { GroupService } from './group.service'
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
            Room
        ]),
        MongooseModule.forFeature([
            { name: GroupMessage.name, schema: GroupMessageSchema }
        ]),
        CloudinaryModule,
        AuthModule // Add AuthModule for JWT support in WebSocket
    ],
    controllers: [GroupController, GroupChatController],
    providers: [GroupService, GroupChatService, GroupChatGateway],
    exports: [GroupService, GroupChatService]
})
export class GroupModule {}
