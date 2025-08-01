import {
    Body,
    Controller,
    Get,
    HttpStatus,
    Post,
    Request,
    UseGuards,
    Logger
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger'
import { AuthService } from './service/auth.service'
import { LoginDto } from './dto/login.dto'
import {
    EmailVerificationDto,
    VerificationCodeSenderDto,
    ForgetPasswordDto,
    UpdatePasswordDto
} from './dto/auth.dto'
import { LocalAuthGuard } from './guards/local-auth.guard'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@ApiTags('🌏 🔒 Auth API')
@Controller('auth')
export class AuthController {
    private readonly logger = new Logger('AuthController')

    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService
    ) {}

    @Get('test')
    @ApiOperation({ summary: 'Test endpoint (no auth required)' })
    test() {
        this.logger.log('Test endpoint called')
        return {
            statusCode: HttpStatus.OK,
            message: 'API is working',
            timestamp: new Date().toISOString()
        }
    }

    @Get('test-auth')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Test authentication' })
    testAuth(@Request() req) {
        this.logger.log('Test auth endpoint called')
        return {
            statusCode: HttpStatus.OK,
            message: 'Authentication is working',
            data: {
                user: req.user,
                timestamp: new Date().toISOString()
            }
        }
    }

    @Post('login')
    @UseGuards(LocalAuthGuard)
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({
        status: 200,
        description: 'Login successful',
        schema: {
            example: {
                statusCode: 200,
                message: 'Login successful',
                data: {
                    user: {
                        id: 1,
                        uuid: '123e4567-e89b-12d3-a456-426614174000',
                        email: 'user@example.com',
                        name: 'John Doe'
                    },
                    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                }
            }
        }
    })
    async login(@Request() req) {
        const data = await this.authService.unifiedAuthResponse(req.user)

        // Log the generated token for debugging
        this.logger.log(
            `🔐 [LOGIN] Token generated for user: ${req.user.email}`
        )
        this.logger.log(
            `   └─ Token preview: ${data.token.substring(0, 50)}...`
        )

        return {
            statusCode: HttpStatus.OK,
            message: 'Login successful',
            data
        }
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user info' })
    @ApiResponse({
        status: 200,
        description: 'Current user information'
    })
    getCurrentUser(@Request() req) {
        this.logger.log('Get current user endpoint called')
        return {
            statusCode: HttpStatus.OK,
            message: 'Current user fetched successfully',
            data: req.user
        }
    }

    /**
     * REFRESHING TOKEN ENDPOINT
     */
    @UseGuards(JwtAuthGuard)
    @Get('refresh-access-token')
    @ApiOperation({
        summary: 'Refreshing your access token'
    })
    @ApiResponse({
        description: 'Something went wrong',
        status: HttpStatus.BAD_REQUEST
    })
    @ApiResponse({
        description: 'Access token has been refreshed successful',
        status: HttpStatus.CREATED
    })
    @ApiBearerAuth()
    async refreshAccessToken(@Request() req) {
        return {
            status: HttpStatus.CREATED,
            message: 'Access token generated',
            result: await this.authService.refreshToken(req.user)
        }
    }

    /**
     * VERIFY EMAIL ENDPOINT
     */
    @Post('verify-email')
    @ApiOperation({ summary: 'Verifying user email' })
    @ApiResponse({ description: 'Bad Request', status: HttpStatus.BAD_REQUEST })
    @ApiResponse({
        description: 'Something went wrong',
        status: HttpStatus.INTERNAL_SERVER_ERROR
    })
    @ApiResponse({
        description: 'User email verified successfully',
        status: HttpStatus.OK
    })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    async verifyEmail(@Body() emailVerificationDto: EmailVerificationDto) {
        return {
            status: HttpStatus.OK,
            message: 'Email verification done successfully',
            result: await this.authService.emailVerification(
                emailVerificationDto
            )
        }
    }

    /**
     * REGENERATING EMAIL VERIFICATION CODE
     */
    @Post('regenerate-code')
    @ApiOperation({ summary: 'Code regeneration.' })
    @ApiResponse({ description: 'Bad Request', status: HttpStatus.BAD_REQUEST })
    @ApiResponse({
        description: 'Something went wrong',
        status: HttpStatus.INTERNAL_SERVER_ERROR
    })
    @ApiResponse({
        description: 'Code generated successfully',
        status: HttpStatus.OK
    })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    async regenerateAnotherCode(
        @Body() verificationCodeSenderDto: VerificationCodeSenderDto
    ) {
        return {
            status: HttpStatus.OK,
            message: 'A new code has been sent to your inbox',
            result: await this.authService.generateEmailVerificationCode(
                verificationCodeSenderDto
            )
        }
    }

    @Post('forget-password')
    @ApiOperation({ summary: 'Getting a code when you forgot the password' })
    @ApiResponse({ description: 'Bad Request', status: HttpStatus.BAD_REQUEST })
    @ApiResponse({
        description: 'Something went wrong',
        status: HttpStatus.INTERNAL_SERVER_ERROR
    })
    @ApiResponse({
        description: 'A code sent to you mail successfully',
        status: HttpStatus.CREATED
    })
    private async forgetPassword(
        @Body() verificationCodeSenderDto: VerificationCodeSenderDto
    ) {
        return {
            status: HttpStatus.CREATED,
            message: 'Code sent',
            result: await this.authService.forgetPassword(
                verificationCodeSenderDto
            )
        }
    }

    @Post('code-verification')
    @ApiOperation({
        summary: 'Verify the code when you do not know your password'
    })
    @ApiResponse({ description: 'Bad Request', status: HttpStatus.BAD_REQUEST })
    @ApiResponse({
        description: 'Something went wrong',
        status: HttpStatus.INTERNAL_SERVER_ERROR
    })
    @ApiResponse({
        description: 'Code has been verified successfully',
        status: HttpStatus.OK
    })
    private async codeVerification(
        @Body() forgetPasswordDto: ForgetPasswordDto
    ) {
        return {
            status: HttpStatus.OK,
            message: 'Code verified',
            result: await this.authService.codeVerification(forgetPasswordDto)
        }
    }

    @Post('recover-password')
    @ApiOperation({ summary: 'Update your password' })
    @ApiResponse({ description: 'Bad Request', status: HttpStatus.BAD_REQUEST })
    @ApiResponse({
        description: 'Something went wrong',
        status: HttpStatus.INTERNAL_SERVER_ERROR
    })
    @ApiResponse({
        description: 'Password updated successfully',
        status: HttpStatus.OK
    })
    private async recoverPassword(
        @Body() updatePasswordDto: UpdatePasswordDto
    ) {
        return {
            status: HttpStatus.CREATED,
            message: 'Password has been set successfully',
            result: await this.authService.recoverPassword(updatePasswordDto)
        }
    }

    @Get('debug/jwt-config')
    @ApiOperation({ summary: 'Debug JWT configuration (remove in production)' })
    debugJwtConfig() {
        const jwtSecret = this.configService.get<string>('JWT_SECRET')
        return {
            secretConfigured: !!jwtSecret,
            secretLength: jwtSecret?.length || 0,
            secretPreview: jwtSecret
                ? `${jwtSecret.substring(0, 4)}...`
                : 'Not configured',
            expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d')
        }
    }

    @Post('debug/verify-token')
    @ApiOperation({
        summary: 'Debug token verification (remove in production)'
    })
    async debugVerifyToken(@Body() body: { token: string }) {
        try {
            const decoded = this.jwtService.decode(body.token) as any
            const verified = await this.jwtService.verifyAsync(body.token)

            return {
                decoded: {
                    id: decoded?.id,
                    uuid: decoded?.uuid,
                    email: decoded?.email,
                    iat: decoded?.iat
                        ? new Date(decoded.iat * 1000).toISOString()
                        : null,
                    exp: decoded?.exp
                        ? new Date(decoded.exp * 1000).toISOString()
                        : null
                },
                verified: true,
                verifiedData: {
                    id: verified?.id,
                    uuid: verified?.uuid,
                    email: verified?.email
                }
            }
        } catch (error) {
            return {
                error: error.name,
                message: error.message,
                decoded: (() => {
                    try {
                        const decoded = this.jwtService.decode(
                            body.token
                        ) as any
                        return {
                            id: decoded?.id,
                            uuid: decoded?.uuid,
                            email: decoded?.email,
                            iat: decoded?.iat
                                ? new Date(decoded.iat * 1000).toISOString()
                                : null,
                            exp: decoded?.exp
                                ? new Date(decoded.exp * 1000).toISOString()
                                : null
                        }
                    } catch {
                        return null
                    }
                })()
            }
        }
    }

    @Get('verify-token')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Verify JWT token is valid' })
    @ApiResponse({
        status: 200,
        description: 'Token is valid'
    })
    verifyToken(@Request() req) {
        return {
            statusCode: HttpStatus.OK,
            message: 'Token is valid',
            data: {
                user: req.user,
                timestamp: new Date().toISOString()
            }
        }
    }
}
