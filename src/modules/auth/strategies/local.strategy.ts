import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-local'
import { AuthService } from '../service/auth.service'

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({ usernameField: 'emailOrPhone' })
    }

    async validate(emailOrPhone: string, password: string): Promise<any> {
        // Use the validateUser method instead of full login
        const user = await this.authService.validateUser(emailOrPhone, password)

        if (!user) {
            throw new UnauthorizedException('Invalid credentials')
        }

        return user
    }
}
