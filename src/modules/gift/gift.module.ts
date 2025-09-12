import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module' // Import AuthModule to provide JwtService
import { RoomParticipant } from '../room/entities/room-participant.entity'
import { User } from '../user/entities/user.entity'
import { GiftTransaction } from './entities/gift-transaction.entity'
import { Gift } from './entities/gift.entity'
import { GiftCategory } from './entities/gift-category.entity'
import { GiftController } from './gift.controller'
// import { GiftGateway } from './gift.gateway' // Temporarily disabled to fix WebSocket conflicts
import { GiftService } from './gift.service'

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Gift,
            GiftCategory,
            GiftTransaction,
            User,
            RoomParticipant
        ]),
        AuthModule // Add AuthModule to imports to provide JwtService for WsJwtGuard
    ],
    controllers: [GiftController],
    providers: [
        GiftService
        // GiftGateway // Temporarily disabled to fix WebSocket conflicts
    ],
    exports: [GiftService]
})
export class GiftModule {}
