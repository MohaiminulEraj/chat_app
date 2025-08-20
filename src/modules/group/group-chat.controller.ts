import {
    Controller,
    Get,
    Post,
    Delete,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    Request,
    HttpStatus
} from '@nestjs/common'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { GroupChatService } from './group-chat.service'

@ApiTags('🗨️ Group Chat API')
@Controller('group-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupChatController {
    constructor(private readonly groupChatService: GroupChatService) {}

    @Get(':groupId/messages')
    @ApiOperation({ summary: 'Get group message history' })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number (default: 1)'
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Messages per page (max: 100, default: 50)'
    })
    @ApiQuery({
        name: 'before',
        required: false,
        type: String,
        description: 'Get messages before this message ID'
    })
    @ApiResponse({
        status: 200,
        description: 'Messages retrieved successfully'
    })
    async getGroupMessages(
        @Param('groupId') groupId: string,
        @Request() req: any,
        @Query('page') pageParam: string = '1',
        @Query('limit') limitParam: string = '50',
        @Query('before') before?: string
    ) {
        // Convert query parameters to numbers with validation
        const page = Math.max(parseInt(pageParam) || 1, 1)
        const limit = Math.min(Math.max(parseInt(limitParam) || 50, 1), 100) // Max 100 messages per request

        // Verify user is member of the group
        const isMember = await this.groupChatService.verifyGroupMembership(
            req.user.uuid,
            groupId
        )

        if (!isMember) {
            return {
                statusCode: HttpStatus.FORBIDDEN,
                message: 'Not a member of this group'
            }
        }

        const messages = await this.groupChatService.getGroupMessageHistory(
            groupId,
            page,
            limit,
            before
        )

        // Format messages to match sendGroupMessageResponse format
        const formattedMessages = await Promise.all(
            messages.map(async (message) => {
                // Get user's actual role from database
                const userRole = await this.groupChatService.getUserRole(
                    groupId,
                    message.senderId
                )

                const response = {
                    _id: message.id, // Flutter expects _id
                    group: groupId,
                    sender: {
                        _id: message.senderId, // Flutter expects _id
                        name: message.senderName,
                        role: userRole || 'member'
                    },
                    content: message.content,
                    avatar: message.senderAvatarUrl || '',
                    createdAt: message.timestamp.toISOString(), // Ensure ISO string format
                    updatedAt: (
                        message.updatedAt || message.timestamp
                    ).toISOString(),
                    __v: 0,
                    type: message.messageType || 'text',
                    success: true
                }

                return response
            })
        )

        return {
            statusCode: HttpStatus.OK,
            message: 'Messages retrieved successfully',
            data: {
                messages: formattedMessages,
                page,
                limit,
                hasMore: messages.length === limit
            }
        }
    }

    @Post(':groupId/messages/:messageId/read')
    @ApiOperation({ summary: 'Mark messages as read' })
    @ApiResponse({ status: 200, description: 'Messages marked as read' })
    async markMessagesAsRead(
        @Param('groupId') groupId: string,
        @Body() body: { messageIds: string[] },
        @Request() req: any
    ) {
        await this.groupChatService.markMessagesAsRead(
            groupId,
            body.messageIds,
            req.user.uuid
        )

        return {
            statusCode: HttpStatus.OK,
            message: 'Messages marked as read'
        }
    }

    @Delete(':groupId/messages/:messageId')
    @ApiOperation({ summary: 'Delete a group message' })
    @ApiResponse({ status: 200, description: 'Message deleted successfully' })
    async deleteMessage(
        @Param('groupId') groupId: string,
        @Param('messageId') messageId: string,
        @Request() req: any
    ) {
        const success = await this.groupChatService.deleteMessage(
            groupId,
            messageId,
            req.user.uuid
        )

        if (!success) {
            return {
                statusCode: HttpStatus.FORBIDDEN,
                message: 'Cannot delete this message'
            }
        }

        return {
            statusCode: HttpStatus.OK,
            message: 'Message deleted successfully'
        }
    }

    @Patch(':groupId/messages/:messageId')
    @ApiOperation({ summary: 'Edit a group message' })
    @ApiResponse({ status: 200, description: 'Message edited successfully' })
    async editMessage(
        @Param('groupId') groupId: string,
        @Param('messageId') messageId: string,
        @Body() body: { content: string },
        @Request() req: any
    ) {
        const updatedMessage = await this.groupChatService.editMessage(
            groupId,
            messageId,
            body.content,
            req.user.uuid
        )

        if (!updatedMessage) {
            return {
                statusCode: HttpStatus.FORBIDDEN,
                message: 'Cannot edit this message'
            }
        }

        return {
            statusCode: HttpStatus.OK,
            message: 'Message edited successfully',
            data: updatedMessage
        }
    }

    @Get(':groupId/members')
    @ApiOperation({ summary: 'Get group members with online status' })
    @ApiResponse({
        status: 200,
        description: 'Group members retrieved successfully'
    })
    async getGroupMembers(
        @Param('groupId') groupId: string,
        @Request() req: any
    ) {
        const isMember = await this.groupChatService.verifyGroupMembership(
            req.user.uuid,
            groupId
        )

        if (!isMember) {
            return {
                statusCode: HttpStatus.FORBIDDEN,
                message: 'Not a member of this group'
            }
        }

        const members = await this.groupChatService.getGroupMembers(groupId)

        return {
            statusCode: HttpStatus.OK,
            message: 'Group members retrieved successfully',
            data: members
        }
    }

    @Get(':groupId/unread-count')
    @ApiOperation({ summary: 'Get unread message count for user' })
    @ApiResponse({
        status: 200,
        description: 'Unread count retrieved successfully'
    })
    async getUnreadCount(
        @Param('groupId') groupId: string,
        @Request() req: any
    ) {
        const count = await this.groupChatService.getUnreadMessageCount(
            groupId,
            req.user.uuid
        )

        return {
            statusCode: HttpStatus.OK,
            message: 'Unread count retrieved successfully',
            data: { unreadCount: count }
        }
    }

    @Get(':groupId/search')
    @ApiOperation({ summary: 'Search messages in group' })
    @ApiResponse({
        status: 200,
        description: 'Search results retrieved successfully'
    })
    async searchMessages(
        @Param('groupId') groupId: string,
        @Request() req: any,
        @Query('q') searchTerm: string,
        @Query('limit') limit: number = 20
    ) {
        const isMember = await this.groupChatService.verifyGroupMembership(
            req.user.uuid,
            groupId
        )

        if (!isMember) {
            return {
                statusCode: HttpStatus.FORBIDDEN,
                message: 'Not a member of this group'
            }
        }

        const messages = await this.groupChatService.searchMessages(
            groupId,
            searchTerm,
            limit
        )

        return {
            statusCode: HttpStatus.OK,
            message: 'Search results retrieved successfully',
            data: messages
        }
    }

    @Get(':groupId/stats')
    @ApiOperation({ summary: 'Get group message statistics' })
    @ApiResponse({
        status: 200,
        description: 'Statistics retrieved successfully'
    })
    async getGroupStats(
        @Param('groupId') groupId: string,
        @Request() req: any
    ) {
        const isMember = await this.groupChatService.verifyGroupMembership(
            req.user.uuid,
            groupId
        )

        if (!isMember) {
            return {
                statusCode: HttpStatus.FORBIDDEN,
                message: 'Not a member of this group'
            }
        }

        const stats = await this.groupChatService.getMessageStats(groupId)

        return {
            statusCode: HttpStatus.OK,
            message: 'Statistics retrieved successfully',
            data: stats
        }
    }
}
