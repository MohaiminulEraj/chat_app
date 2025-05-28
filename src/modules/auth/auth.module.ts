import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { jwtConfig } from 'src/config/jwt.config'
import { User } from 'src/modules/users/entities/user.entity'
import { EmailService } from '../email/services/email.service'
import { AuthController } from './auth.controller'
import { LoginLog } from './entities/login-log.entity'
import { AuthService } from './service/auth.service'
import { JwtService } from './service/jwt.service'
import { JwtStrategy } from './strategy/jwt.strategy'
@Module({
    imports: [
        JwtModule.registerAsync(jwtConfig),
        TypeOrmModule.forFeature([User, LoginLog])
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        JwtService,
        JwtStrategy,
        ConfigService,
        EmailService
    ],
    exports: [AuthService]
})
export class AuthModule {}
