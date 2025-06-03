import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { jwtConfig } from 'src/config/jwt.config'
import { User } from 'src/modules/user/entities/user.entity'
import { EmailService } from '../email/services/email.service'
import { UserModule } from '../user/user.module'
import { AuthController } from './auth.controller'
import { LoginLog } from './entities/login-log.entity'
import { AuthService } from './service/auth.service'
import { JwtService } from './service/jwt.service'
import { LocalStrategy } from './strategies/local.strategy'
import { JwtStrategy } from './strategy/jwt.strategy'

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync(jwtConfig),
        TypeOrmModule.forFeature([User, LoginLog]),
        UserModule
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtService,
        JwtStrategy,
        LocalStrategy,
        ConfigService,
        EmailService
    ],
    exports: [AuthService, JwtModule] // Export AuthService and JwtModule
})
export class AuthModule {}
