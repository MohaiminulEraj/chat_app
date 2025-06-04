import {
    Controller,
    Get,
    HttpStatus,
    Param,
    Query,
    Request,
    UseGuards
} from '@nestjs/common'
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags
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
