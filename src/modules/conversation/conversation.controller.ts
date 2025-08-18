import {
    Controller,
    Get,
    HttpStatus,
    Param,
    Query,
    Request,
    UseGuards,
    Post,
    Body
} from '@nestjs/common'
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
    ApiBody
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ConversationService } from './conversation.service'

@ApiTags('💬 Conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationController {
    constructor(private readonly conversationService: ConversationService) {}

    @Get()
    @ApiOperation({
        summary: 'Get user conversations',
        description: 'Get all conversations for the authenticated user'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of conversations'
    })
    async getUserConversations(@Request() req) {
        const data = await this.conversationService.getUserConversations(
            req.user.uuid
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Conversations fetched successfully',
            data
        }
    }

    @Post('user-conversations')
    @ApiOperation({
        summary: 'Get user conversations without authentication',
        description: 'Get all conversations for a specific user'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                userId: {
                    type: 'string',
                    description: 'User UUID',
                    example: 'user-uuid-here'
                }
            },
            required: ['userId']
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description:
            'List of conversations with avatar, name, last message, and last message time'
    })
    async getUserConversationsNoAuth(@Body() body: { userId: string }) {
        if (!body.userId) {
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'userId is required',
                data: null
            }
        }

        try {
            const data = await this.conversationService.getUserConversations(
                body.userId
            )
            return {
                statusCode: HttpStatus.OK,
                message: 'Conversations fetched successfully',
                data
            }
        } catch (error) {
            return {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to fetch conversations',
                error: error.message
            }
        }
    }

    @Post('find-conversation')
    @ApiOperation({
        summary: 'Find conversation between two users',
        description:
            'Get conversation ID between two specific users if it exists'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                userId1: {
                    type: 'string',
                    description: 'First user UUID',
                    example: 'user-1-uuid-here'
                },
                userId2: {
                    type: 'string',
                    description: 'Second user UUID',
                    example: 'user-2-uuid-here'
                }
            },
            required: ['userId1', 'userId2']
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Conversation ID if exists, null if not found'
    })
    async findConversationBetweenUsers(
        @Body() body: { userId1: string; userId2: string }
    ) {
        if (!body.userId1 || !body.userId2) {
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'Both userId1 and userId2 are required',
                data: null
            }
        }

        if (body.userId1 === body.userId2) {
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'Cannot create conversation with the same user',
                data: null
            }
        }

        try {
            const result =
                await this.conversationService.getConversationIdBetweenUsers(
                    body.userId1,
                    body.userId2,
                    false // Don't create if not exists
                )

            return {
                statusCode: HttpStatus.OK,
                message: result.conversationId
                    ? 'Conversation found successfully'
                    : 'No conversation exists between these users',
                data: {
                    conversationId: result.conversationId,
                    exists: result.exists,
                    participants: [body.userId1, body.userId2]
                }
            }
        } catch (error) {
            return {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to find conversation',
                error: error.message
            }
        }
    }

    @Post('get-or-create-conversation')
    @ApiOperation({
        summary: 'Get or create conversation between two users',
        description:
            'Get existing conversation ID or create new one between two specific users (no auth required)'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                userId1: {
                    type: 'string',
                    description: 'First user UUID',
                    example: 'user-1-uuid-here'
                },
                userId2: {
                    type: 'string',
                    description: 'Second user UUID',
                    example: 'user-2-uuid-here'
                }
            },
            required: ['userId1', 'userId2']
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Conversation ID (existing or newly created)'
    })
    async getOrCreateConversationBetweenUsers(
        @Body() body: { userId1: string; userId2: string }
    ) {
        if (!body.userId1 || !body.userId2) {
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'Both userId1 and userId2 are required',
                data: null
            }
        }

        if (body.userId1 === body.userId2) {
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'Cannot create conversation with the same user',
                data: null
            }
        }

        try {
            const result =
                await this.conversationService.getConversationIdBetweenUsers(
                    body.userId1,
                    body.userId2,
                    true // Create if not exists
                )

            return {
                statusCode: HttpStatus.OK,
                message: result.exists
                    ? 'Existing conversation found'
                    : 'New conversation created',
                data: {
                    conversationId: result.conversationId,
                    exists: result.exists,
                    participants: [body.userId1, body.userId2],
                    conversation: result.conversation
                        ? {
                              id: result.conversation.id,
                              uuid: result.conversation.uuid,
                              type: result.conversation.type,
                              messageCount: result.conversation.messageCount,
                              lastMessageAt: result.conversation.lastMessageAt
                          }
                        : null
                }
            }
        } catch (error) {
            return {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to get or create conversation',
                error: error.message
            }
        }
    }

    @Get(':id/messages')
    @ApiOperation({
        summary: 'Get conversation messages',
        description: 'Get all messages for a specific conversation'
    })
    @ApiParam({
        name: 'id',
        description: 'Conversation UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of all messages'
    })
    async getMessages(@Request() req, @Param('id') conversationId: string) {
        const data = await this.conversationService.getMessages(
            conversationId,
            req.user.uuid
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Messages fetched successfully',
            data
        }
    }
}
