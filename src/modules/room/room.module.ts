import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module' // Import AuthModule
import { CloudinaryModule } from '../cloudinary/cloudinary.module' // Import CloudinaryModule
import { GiftModule } from '../gift/gift.module' // Import GiftModule for gift functionality
import { GroupMember } from '../group/entities/group-member.entity'
import { Group } from '../group/entities/group.entity'
import { User } from '../user/entities/user.entity'
import { RoomComment } from './entities/room-comment.entity'
import { RoomParticipant } from './entities/room-participant.entity'
import { RoomRoleAssignment } from './entities/room-role.entity'
import { RoomSeat } from './entities/room-seat.entity'
import { RoomWaitingList } from './entities/room-waiting-list.entity'
import { Room } from './entities/room.entity'
import { RoomController } from './room.controller'
import { RoomGateway } from './room.gateway' // Re-enable the gateway
import { RoomRootGateway } from './room-root.gateway' // Add root namespace gateway for debugging
import { RoomService } from './room.service'

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Room,
            RoomParticipant,
            RoomWaitingList,
            RoomRoleAssignment,
            RoomSeat,
            RoomComment,
            GroupMember,
            Group,
            User
        ]),
        AuthModule, // Add AuthModule to provide JwtService for WsJwtGuard
        CloudinaryModule, // Add CloudinaryModule for image upload functionality
        GiftModule // Add GiftModule for gift functionality
    ],
    controllers: [RoomController],
    providers: [
        RoomService,
        RoomGateway, // Re-enable the gateway
        RoomRootGateway // Add root namespace gateway for debugging
    ],
    exports: [RoomService]
})
export class RoomModule {}
