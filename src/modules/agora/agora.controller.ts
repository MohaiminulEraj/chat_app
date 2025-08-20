import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpStatus,
    Logger,
    Post,
    Request,
    UseGuards
} from '@nestjs/common'
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AgoraService } from './agora.service'
import { AgoraRole, GenerateAgoraTokenDto } from './dto/generate-token.dto'

@ApiTags('🎵 Agora Voice')
@Controller('agora')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AgoraController {
    private readonly logger = new Logger(AgoraController.name)

    constructor(private readonly agoraService: AgoraService) {}

    @Post('generate-token')
    @ApiOperation({
        summary: 'Generate Agora RTC token',
        description:
            'Generate a token for joining an Agora voice channel using the authenticated user ID'
    })
    @ApiBody({ type: GenerateAgoraTokenDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Agora token generated successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Agora token generated successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        token: {
                            type: 'string',
                            example: '007eJxTYJiUbh2R/6FCo0LCp/Tb1eY...'
                        },
                        channelName: {
                            type: 'string',
                            example: 'room_123e4567-e89b-12d3-a456-426614174000'
                        },
                        userId: {
                            type: 'string',
                            example: 'user_123e4567-e89b-12d3-a456-426614174000'
                        },
                        role: {
                            type: 'string',
                            enum: Object.values(AgoraRole),
                            example: 'publisher'
                        },
                        expireAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-08-02T11:45:00Z'
                        },
                        appId: {
                            type: 'string',
                            example: 'b9981f12bc0648e6a107ed47df9a4a3e'
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid parameters or missing user information'
    })
    async generateToken(
        @Body() generateTokenDto: GenerateAgoraTokenDto,
        @Request() req: any
    ) {
        try {
            const { channelName, role = AgoraRole.PUBLISHER } = generateTokenDto
            const userId = req.user?.uuid || req.user?.id

            this.logger.log(
                `🎯 Token generation request - Channel: ${channelName}, Role: ${role}, User: ${userId}`
            )

            if (!userId) {
                throw new BadRequestException('User ID not found in token')
            }

            if (!channelName || channelName.trim() === '') {
                throw new BadRequestException(
                    'Channel name is required and cannot be empty'
                )
            }

            // Use string userId with default expiry (7200 seconds = 2 hours)
            const agoraRole =
                role === AgoraRole.PUBLISHER
                    ? this.agoraService.getRoles().PUBLISHER
                    : this.agoraService.getRoles().SUBSCRIBER

            this.logger.log(
                `🔑 Generating token with role: ${role} (${agoraRole}) for USER ACCOUNT`
            )
            this.logger.log(
                `📱 This token is compatible with Flutter joinChannelWithUserAccount()`
            )

            // Use generateTokenWithString which now uses buildTokenWithUserAccount
            const token = this.agoraService.generateTokenWithString(
                channelName,
                userId,
                agoraRole,
                7200 // 2 hours
            )

            const expireAt = new Date(Date.now() + 7200 * 1000) // Default 2 hours

            const response = {
                statusCode: HttpStatus.OK,
                message: 'Agora token generated successfully',
                data: {
                    token,
                    channelName,
                    userId,
                    role,
                    expireAt,
                    appId: process.env.AGORA_APP_ID,
                    tokenLength: token.length,
                    tokenFormat: token.startsWith('007')
                        ? 'AccessToken2 (007)'
                        : 'Legacy format',
                    tokenPreview: `${token.substring(0, 20)}...`,
                    compatibleWith: 'Flutter joinChannelWithUserAccount()',
                    generatedAt: new Date().toISOString(),
                    debug: {
                        method: 'buildTokenWithUserAccount',
                        userAccountType: 'string',
                        roleValue: agoraRole,
                        expireSeconds: 7200
                    }
                }
            }

            this.logger.log(
                `✅ Token generated successfully for user ${userId} in channel ${channelName}`
            )
            return response
        } catch (error) {
            this.logger.error(
                `❌ Token generation failed: ${error.message}`,
                error.stack
            )

            if (error instanceof BadRequestException) {
                throw error
            }

            throw new BadRequestException(
                error.message || 'Failed to generate Agora token'
            )
        }
    }

    @Get('debug/config')
    @ApiOperation({
        summary: 'Get Agora configuration debug info',
        description:
            'Get debug information about Agora configuration (for troubleshooting)'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Agora configuration debug info'
    })
    async getDebugConfig() {
        try {
            const config = this.agoraService.getDebugConfiguration()

            return {
                statusCode: HttpStatus.OK,
                message: 'Agora debug configuration retrieved',
                data: config
            }
        } catch (error) {
            this.logger.error(`❌ Failed to get debug config: ${error.message}`)
            throw new BadRequestException(
                'Failed to retrieve debug configuration'
            )
        }
    }

    @Post('validate-token')
    @ApiOperation({
        summary: 'Validate Agora token format',
        description: 'Check if a token has the correct format and structure'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Token validation result'
    })
    async validateToken(
        @Body()
        body: {
            token: string
            channelName?: string
            userAccount?: string
        }
    ) {
        try {
            const { token, channelName, userAccount } = body

            if (!token) {
                throw new BadRequestException('Token is required')
            }

            const validation = {
                isValid: true,
                format: token.startsWith('007')
                    ? 'AccessToken2 (007)'
                    : 'Legacy or Invalid',
                length: token.length,
                preview: `${token.substring(0, 20)}...`,
                isAccessToken2: token.startsWith('007'),
                expectedMinLength: 100, // Typical minimum length for valid tokens
                lengthCheck: token.length >= 100,
                channelName: channelName || 'not provided',
                userAccount: userAccount || 'not provided',
                timestamp: new Date().toISOString()
            }

            // Additional checks
            const issues = []
            if (!token.startsWith('007')) {
                issues.push(
                    'Token does not start with 007 (AccessToken2 format)'
                )
            }
            if (token.length < 100) {
                issues.push('Token length is suspiciously short')
            }
            if (token.includes(' ')) {
                issues.push('Token contains spaces (invalid)')
            }

            validation.isValid = issues.length === 0

            return {
                statusCode: HttpStatus.OK,
                message: validation.isValid
                    ? 'Token format appears valid'
                    : 'Token format issues detected',
                data: {
                    ...validation,
                    issues: issues.length > 0 ? issues : undefined
                }
            }
        } catch (error) {
            this.logger.error(`❌ Token validation failed: ${error.message}`)
            throw new BadRequestException('Failed to validate token')
        }
    }

    @Post('get-roles')
    @ApiOperation({
        summary: 'Get available Agora roles',
        description: 'Get the list of available roles for Agora voice channels'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Available Agora roles',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Available Agora roles retrieved successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        roles: {
                            type: 'object',
                            properties: {
                                PUBLISHER: {
                                    type: 'string',
                                    example: 'publisher',
                                    description:
                                        'Can publish and subscribe (speaker/host)'
                                },
                                SUBSCRIBER: {
                                    type: 'string',
                                    example: 'subscriber',
                                    description: 'Can only subscribe (listener)'
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    async getRoles() {
        return {
            statusCode: HttpStatus.OK,
            message: 'Available Agora roles retrieved successfully',
            data: {
                roles: {
                    PUBLISHER: AgoraRole.PUBLISHER,
                    SUBSCRIBER: AgoraRole.SUBSCRIBER
                },
                descriptions: {
                    PUBLISHER: 'Can publish and subscribe (speaker/host)',
                    SUBSCRIBER: 'Can only subscribe (listener)'
                }
            }
        }
    }
}
