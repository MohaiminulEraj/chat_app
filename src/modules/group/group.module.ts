import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GroupController } from './group.controller'
import { GroupService } from './group.service'
import { Group } from './entities/group.entity'
import { GroupMember } from './entities/group-member.entity'
import { GroupRole } from './entities/group-role.entity'
import { GroupSettings } from './entities/group-settings.entity'
import { User } from '../user/entities/user.entity'
import { UserModule } from '../user/user.module'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'
import { AuthModule } from '../auth/auth.module'

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Group,
            GroupMember,
            GroupRole,
            GroupSettings,
            User
        ]),
        UserModule,
        CloudinaryModule,
        AuthModule // Make sure AuthModule is imported
    ],
    controllers: [GroupController],
    providers: [GroupService],
    exports: [GroupService]
})
export class GroupModule {}
