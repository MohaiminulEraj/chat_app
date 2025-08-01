import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from 'src/modules/user/entities/user.entity'
import { EmailService } from '../email/services/email.service'
import { UserModule } from '../user/user.module'
import { AuthController } from './auth.controller'
import { LoginLog } from './entities/login-log.entity'
import { AuthService } from './service/auth.service'
import { JwtService } from './service/jwt.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { LocalStrategy } from './strategies/local.strategy'

@Module({
    imports: [
        ConfigModule,
        UserModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const secret = configService.get<string>('JWT_SECRET')
                console.log(
                    '🔐 [Auth Module] Configuring JWT with secret length:',
                    secret?.length || 0
                )
                console.log(
                    '🔐 [Auth Module] JWT Secret first 4 chars:',
                    secret?.substring(0, 4) + '...'
                )

                if (!secret || secret === 'your-jwt-secret-here') {
                    console.error(
                        '⚠️  [Auth Module] WARNING: Using default JWT secret. Please set JWT_SECRET in .env file!'
                    )
                }

                return {
                    secret: secret,
                    signOptions: {
                        expiresIn: configService.get<string>(
                            'JWT_EXPIRES_IN',
                            '7d'
                        )
                    }
                }
            }
        }),
        TypeOrmModule.forFeature([User, LoginLog])
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
    exports: [AuthService, JwtModule]
})
export class AuthModule {}
