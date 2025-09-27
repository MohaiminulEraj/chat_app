import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'
import { Friendship } from '../friendship/entities/friendship.entity'
import { ConversionController } from './controllers/conversion.controller'
import { AdminWallet } from './entities/admin-wallet.entity'
import { ConversionConfig } from './entities/conversion-config.entity'
import { ConversionTransaction } from './entities/conversion-transaction.entity'
import { ProfileVisit } from './entities/profile-visit.entity'
import { User } from './entities/user.entity'
import { ConversionService } from './services/conversion.service'
import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            Friendship,
            ProfileVisit,
            ConversionConfig,
            ConversionTransaction,
            AdminWallet
        ]),
        CloudinaryModule
    ],
    controllers: [UserController, ConversionController],
    providers: [UserService, ConversionService],
    exports: [UserService, ConversionService]
})
export class UserModule {}
