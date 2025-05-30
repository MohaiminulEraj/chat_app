import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../user/entities/user.entity'
import { Friendship } from './entities/friendship.entity'
import { FriendshipController } from './friendship.controller'
import { FriendshipService } from './friendship.service'

@Module({
    imports: [TypeOrmModule.forFeature([Friendship, User])],
    controllers: [FriendshipController],
    providers: [FriendshipService],
    exports: [FriendshipService]
})
export class FriendshipModule {}
