import {
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Param,
    Post,
    Request,
    UseGuards
} from '@nestjs/common'
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateFriendshipDto } from './dto/create-friendship.dto'
import { Friendship } from './entities/friendship.entity'
import { FriendshipService } from './friendship.service'

@ApiTags('🤝 Friendships')
@Controller('friendships')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendshipController {
    constructor(private readonly friendshipService: FriendshipService) {}

    @Post('request')
    @ApiOperation({
        summary: 'Send friend request',
        description: 'Send a friend request to another user'
    })
    @ApiBody({ type: CreateFriendshipDto })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Friend request sent successfully',
        type: Friendship
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Cannot send friend request to yourself'
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Friend request already exists'
    })
    async sendRequest(
        @Request() req,
        @Body() createFriendshipDto: CreateFriendshipDto
    ): Promise<{ statusCode: number; message: string; data: Friendship }> {
        const data = await this.friendshipService.sendFriendRequest(
            req.user.uuid,
            createFriendshipDto.friendId
        )
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Friend request sent successfully',
            data
        }
    }

    @Post(':friendshipId/accept')
    @ApiOperation({
        summary: 'Accept friend request',
        description: 'Accept a pending friend request'
    })
    @ApiParam({
        name: 'friendshipId',
        description: 'Friendship UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Friend request accepted'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Friend request not found'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'You cannot accept this friend request'
    })
    async acceptRequest(
        @Request() req,
        @Param('friendshipId') friendshipId: string
    ) {
        const data = await this.friendshipService.acceptFriendRequest(
            friendshipId,
            req.user.uuid
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Friend request accepted successfully',
            data
        }
    }

    @Post(':friendshipId/decline')
    @ApiOperation({
        summary: 'Decline friend request',
        description: 'Decline a pending friend request'
    })
    @ApiParam({
        name: 'friendshipId',
        description: 'Friendship UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Friend request declined'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Friend request not found'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'You cannot decline this friend request'
    })
    async declineRequest(
        @Request() req,
        @Param('friendshipId') friendshipId: string
    ) {
        const data = await this.friendshipService.declineFriendRequest(
            friendshipId,
            req.user.uuid
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Friend request declined successfully',
            data
        }
    }

    @Get()
    @ApiOperation({
        summary: 'Get all friends',
        description: 'Get list of all accepted friends'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of friends',
        type: [Friendship]
    })
    async getFriends(@Request() req) {
        const data = await this.friendshipService.getFriends(req.user.uuid)
        return {
            statusCode: HttpStatus.OK,
            message: 'Friends fetched successfully',
            data
        }
    }

    @Get('pending')
    @ApiOperation({
        summary: 'Get pending friend requests',
        description: 'Get list of pending friend requests (sent and received)'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of pending friend requests',
        schema: {
            type: 'object',
            properties: {
                sent: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Friendship' }
                },
                received: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Friendship' }
                }
            }
        }
    })
    async getPendingRequests(@Request() req) {
        const data = await this.friendshipService.getPendingRequests(
            req.user.uuid
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Pending requests fetched successfully',
            data
        }
    }

    @Delete(':friendId')
    @ApiOperation({
        summary: 'Remove friend',
        description: 'Remove a friend from your friend list'
    })
    @ApiParam({
        name: 'friendId',
        description: 'Friend user UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Friend removed successfully'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Friendship not found'
    })
    async removeFriend(@Request() req, @Param('friendId') friendId: string) {
        const data = await this.friendshipService.removeFriend(
            req.user.uuid,
            friendId
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Friend removed successfully',
            data
        }
    }

    @Post('block/:userId')
    @ApiOperation({
        summary: 'Block user',
        description: 'Block a user from sending friend requests or messages'
    })
    @ApiParam({
        name: 'userId',
        description: 'User UUID to block'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User blocked successfully'
    })
    async blockUser(@Request() req, @Param('userId') userId: string) {
        const data = await this.friendshipService.blockUser(
            req.user.uuid,
            userId
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'User blocked successfully',
            data
        }
    }

    @Delete('block/:userId')
    @ApiOperation({
        summary: 'Unblock user',
        description: 'Unblock a previously blocked user'
    })
    @ApiParam({
        name: 'userId',
        description: 'User UUID to unblock'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User unblocked successfully'
    })
    async unblockUser(@Request() req, @Param('userId') userId: string) {
        const data = await this.friendshipService.unblockUser(
            req.user.uuid,
            userId
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'User unblocked successfully',
            data
        }
    }

    @Get('blocked')
    @ApiOperation({
        summary: 'Get blocked users',
        description: 'Get list of all blocked users'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of blocked users',
        type: [Friendship]
    })
    async getBlockedUsers(@Request() req) {
        const data = await this.friendshipService.getBlockedUsers(req.user.uuid)
        return {
            statusCode: HttpStatus.OK,
            message: 'Blocked users fetched successfully',
            data
        }
    }
}
