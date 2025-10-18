import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CountryController } from './country.controller'
import { CountryService } from './country.service'
import { Country } from './entities/country.entity'
import { AdminGuard } from '../../common/guards/admin.guard'

@Module({
    imports: [TypeOrmModule.forFeature([Country])],
    controllers: [CountryController],
    providers: [CountryService, AdminGuard],
    exports: [CountryService]
})
export class CountryModule {}
