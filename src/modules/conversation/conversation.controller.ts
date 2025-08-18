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
        description:
            'Get all conversations for a specific user (no auth required)'
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

    @Get(':id/messages')
    @ApiOperation({
        summary: 'Get conversation messages',
        description: 'Get messages for a specific conversation'
    })
    @ApiParam({
        name: 'id',
        description: 'Conversation UUID'
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of messages to fetch',
        example: 50
    })
    @ApiQuery({
        name: 'before',
        required: false,
        description: 'Fetch messages before this timestamp'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of messages'
    })
    async getMessages(
        @Request() req,
        @Param('id') conversationId: string,
        @Query('limit') limit: number = 50,
        @Query('before') before?: string
    ) {
        const data = await this.conversationService.getMessages(
            conversationId,
            req.user.uuid,
            limit,
            before
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Messages fetched successfully',
            data
        }
    }
}
