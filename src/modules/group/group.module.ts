import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'
import { Room } from '../room/entities/room.entity'
import { GroupMember } from './entities/group-member.entity'
import { GroupRole } from './entities/group-role.entity'
import { GroupSettings } from './entities/group-settings.entity'
import { Group } from './entities/group.entity'
import { GroupController } from './group.controller'
import { GroupService } from './group.service'

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Group,
            GroupMember,
            GroupRole,
            GroupSettings,
            Room
        ]),
        CloudinaryModule
    ],
    controllers: [GroupController],
    providers: [GroupService],
    exports: [GroupService]
})
export class GroupModule {}
