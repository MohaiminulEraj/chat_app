import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'
import { Friendship } from '../friendship/entities/friendship.entity'
import { ProfileVisit } from './entities/profile-visit.entity'
import { User } from './entities/user.entity'
import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Friendship, ProfileVisit]),
        CloudinaryModule
    ],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService]
})
export class UserModule {}
