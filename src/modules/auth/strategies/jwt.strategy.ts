import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UserService } from 'src/modules/user/user.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private userService: UserService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET') || 'your-secret-key'
        })
    }

    async validate(payload: any) {
        // Make sure we're returning the full user object with uuid
        const user = await this.userService.findOne(payload.sub || payload.uuid)

        if (!user) {
            throw new UnauthorizedException()
        }

        // Return user object that will be attached to request.user
        return {
            uuid: user.uuid,
            id: user.id,
            email: user.email,
            displayName: user.displayName
        }
    }
}
