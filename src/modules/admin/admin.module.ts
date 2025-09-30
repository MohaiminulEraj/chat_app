import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { User } from '../user/entities/user.entity'
import { AdminTransaction } from '../user/entities/admin-transaction.entity'
import { ConversionConfig } from '../user/entities/conversion-config.entity'
import { AdminWallet } from '../user/entities/admin-wallet.entity'
import { AdminGuard } from '../../common/guards/admin.guard'

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            AdminTransaction,
            ConversionConfig,
            AdminWallet
        ])
    ],
    controllers: [AdminController],
    providers: [AdminService, AdminGuard],
    exports: [AdminService]
})
export class AdminModule {}
