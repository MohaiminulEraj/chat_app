import {
    BadRequestException,
    Body,
    Controller,
    HttpStatus,
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

            if (!userId) {
                throw new BadRequestException('User ID not found in token')
            }

            // Use string userId with default expiry (3600 seconds)
            const agoraRole =
                role === AgoraRole.PUBLISHER
                    ? this.agoraService.getRoles().PUBLISHER
                    : this.agoraService.getRoles().SUBSCRIBER

            const token = this.agoraService.generateTokenWithString(
                channelName,
                userId,
                agoraRole
            )

            const expireAt = new Date(Date.now() + 3600 * 1000) // Default 1 hour

            return {
                statusCode: HttpStatus.OK,
                message: 'Agora token generated successfully',
                data: {
                    token,
                    channelName,
                    userId,
                    role,
                    expireAt,
                    appId: process.env.AGORA_APP_ID
                }
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error
            }

            throw new BadRequestException(
                error.message || 'Failed to generate Agora token'
            )
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
