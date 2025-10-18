import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { AuthModule } from '../auth/auth.module' // Import AuthModule
import { CloudinaryModule } from '../cloudinary/cloudinary.module' // Import CloudinaryModule
import { GiftModule } from '../gift/gift.module' // Import GiftModule for gift functionality
import { GroupMember } from '../group/entities/group-member.entity'
import { Group } from '../group/entities/group.entity'
import { User } from '../user/entities/user.entity'
import { UserProfileStats } from '../user/entities/user-profile-stats.entity'
import { Friendship } from '../friendship/entities/friendship.entity'
import { RoomBlockedUser } from './entities/room-blocked-user.entity'
import { RoomComment } from './entities/room-comment.entity'
import { RoomParticipant } from './entities/room-participant.entity'
import { RoomRoleAssignment } from './entities/room-role.entity'
import { RoomSeat } from './entities/room-seat.entity'
import { RoomWaitingList } from './entities/room-waiting-list.entity'
import { RoomActivityTracking } from './entities/room-activity-tracking.entity'
import { RoomRanking } from './entities/room-ranking.entity'
import { Room } from './entities/room.entity'
import { PKBattle } from './entities/pk-battle.entity'
import { PKBattleParticipant } from './entities/pk-battle-participant.entity'
import { PKBattleGift } from './entities/pk-battle-gift.entity'
import { Gift } from '../gift/entities/gift.entity'
import { GiftTransaction } from '../gift/entities/gift-transaction.entity'
import { RoomController } from './room.controller'
import { RoomGateway } from './room.gateway' // Main gateway now uses root namespace
import { RoomService } from './room.service'
import { RoomRankingService } from './services/room-ranking.service'
import { TaskModule } from '../task/task.module'

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Room,
            RoomParticipant,
            RoomWaitingList,
            RoomRoleAssignment,
            RoomSeat,
            RoomComment,
            RoomBlockedUser,
            RoomActivityTracking,
            RoomRanking,
            PKBattle,
            PKBattleParticipant,
            PKBattleGift,
            GroupMember,
            Group,
            User,
            Gift,
            GiftTransaction,
            UserProfileStats,
            Friendship
        ]),
        ScheduleModule.forRoot(),
        AuthModule, // Add AuthModule to provide JwtService for WsJwtGuard
        CloudinaryModule, // Add CloudinaryModule for image upload functionality
        GiftModule, // Add GiftModule for gift functionality
        TaskModule // Add TaskModule for daily tasks functionality
    ],
    controllers: [RoomController],
    providers: [
        RoomService,
        RoomGateway, // Main gateway now uses root namespace
        RoomRankingService
    ],
    exports: [RoomService, RoomRankingService]
})
export class RoomModule {}
