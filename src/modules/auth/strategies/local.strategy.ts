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
        // Create a mock loginDto to match the service's expected format
        const loginDto = { emailOrPhone, password }

        try {
            // Use the existing login method but extract just the user info
            const result = await this.authService.login({}, loginDto)
            // The result is the full auth response, return it directly
            return result
        } catch (error) {
            throw new UnauthorizedException('Invalid credentials')
        }
    }
}
