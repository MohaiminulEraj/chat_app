import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module' // Import AuthModule
import { GroupMember } from '../group/entities/group-member.entity'
import { RoomParticipant } from './entities/room-participant.entity'
import { RoomRoleAssignment } from './entities/room-role.entity'
import { RoomWaitingList } from './entities/room-waiting-list.entity'
import { Room } from './entities/room.entity'
import { RoomController } from './room.controller'
// import { RoomGateway } from './room.gateway' // Temporarily disabled to fix WebSocket conflicts
import { RoomService } from './room.service'

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Room,
            RoomParticipant,
            RoomWaitingList,
            RoomRoleAssignment,
            GroupMember
        ]),
        AuthModule // Add AuthModule to provide JwtService for WsJwtGuard
    ],
    controllers: [RoomController],
    providers: [
        RoomService
        // RoomGateway  // Temporarily disabled to fix WebSocket conflicts
    ],
    exports: [RoomService]
})
export class RoomModule {}
