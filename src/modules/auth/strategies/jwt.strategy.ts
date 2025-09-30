import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UserService } from '../../user/user.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    private readonly logger = new Logger('JwtStrategy')

    constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService
    ) {
        const jwtSecret = configService.get<string>('APP_SECRET')

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
            passReqToCallback: false
        })

        this.logger.log(`🔐 [JWT_STRATEGY] Initialized`)
        this.logger.log(`   ├─ Secret Length: ${jwtSecret?.length || 0}`)
        this.logger.log(
            `   └─ Secret Preview: ${jwtSecret?.substring(0, 4)}...`
        )

        if (!jwtSecret || jwtSecret === 'your-jwt-secret-here') {
            this.logger.error('⚠️  [JWT_STRATEGY] WARNING: Invalid JWT secret!')
        }
    }

    async validate(payload: any) {
        this.logger.log(`🔍 [JWT_STRATEGY] Validating JWT payload`)
        this.logger.log(`   ├─ Payload ID: ${payload.id}`)
        this.logger.log(`   ├─ Payload UUID: ${payload.uuid}`)
        this.logger.log(`   ├─ Payload Email: ${payload.email}`)
        this.logger.log(
            `   └─ Expires: ${
                payload.exp
                    ? new Date(payload.exp * 1000).toISOString()
                    : 'No expiry'
            }`
        )

        try {
            const user = await this.userService.findOne(payload.uuid)

            if (!user) {
                this.logger.error(
                    `❌ [JWT_STRATEGY] User not found: ${payload.uuid}`
                )
                throw new UnauthorizedException('User not found')
            }

            this.logger.log(`✅ [JWT_STRATEGY] User validated: ${user.email}`)
            this.logger.log(`   └─ User Type: ${user.userType}`)

            return {
                id: user.id,
                uuid: user.uuid,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                userType: user.userType
            }
        } catch (error) {
            this.logger.error(
                `❌ [JWT_STRATEGY] Validation error: ${error.message}`
            )
            throw new UnauthorizedException('Invalid token')
        }
    }
}
