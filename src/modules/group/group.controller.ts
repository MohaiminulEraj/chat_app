import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Request,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors
} from '@nestjs/common'
import {
    FileFieldsInterceptor,
    FileInterceptor
} from '@nestjs/platform-express'
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateGroupDto } from './dto/create-group.dto'
import { UpdateGroupSettingsDto } from './dto/update-group-settings.dto'
import { GroupMember } from './entities/group-member.entity'
import { GroupRole } from './entities/group-role.entity'
import { GroupSettings } from './entities/group-settings.entity'
import { Group } from './entities/group.entity'
import { GroupCategory } from './group.constants'
import { GroupService } from './group.service'

@ApiTags('👥 Groups')
@Controller('groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupController {
    constructor(private readonly groupService: GroupService) {}

    @Post()
    @ApiOperation({
        summary: 'Create a new group',
        description:
            'Create a new group with optional initial members and avatar'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string', example: 'Study Group' },
                description: {
                    type: 'string',
                    example: 'A group for discussing study materials'
                },
                isPublic: { type: 'boolean', example: false },
                memberIds: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['123e4567-e89b-12d3-a456-426614174000']
                },
                avatar: {
                    type: 'string',
                    format: 'binary',
                    description: 'Group avatar image file'
                },
                flag: {
                    type: 'string',
                    format: 'binary',
                    description: 'Group flag image file'
                }
            },
            required: ['name']
        }
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Group created successfully',
        type: Group
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Cannot add yourself as a member'
    })
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'avatar', maxCount: 1 },
            { name: 'flag', maxCount: 1 }
        ])
    )
    async create(
        @Request() req: any,
        @Body() createGroupDto: CreateGroupDto,
        @UploadedFiles()
        files: { avatar?: Express.Multer.File[]; flag?: Express.Multer.File[] }
    ) {
        const avatarFile = files.avatar?.[0]
        const flagFile = files.flag?.[0]

        // Parse memberIds if it's a string (from multipart/form-data)
        if (
            typeof createGroupDto.memberIds === 'string' &&
            createGroupDto.memberIds
        ) {
            createGroupDto.memberIds = (createGroupDto.memberIds as string)
                .split(',')
                .map((id) => id.trim())
        }

        // Convert string boolean to actual boolean if needed
        if (typeof createGroupDto.isPublic === 'string') {
            createGroupDto.isPublic = createGroupDto.isPublic === 'true'
        }

        try {
            const data = await this.groupService.createGroup(
                req.user.uuid,
                createGroupDto,
                avatarFile,
                flagFile
            )
            return {
                statusCode: HttpStatus.CREATED,
                message: 'Group created successfully',
                data
            }
        } catch (error) {
            if (
                error.message?.includes('timeout') ||
                error.message?.includes('Request Timeout')
            ) {
                throw new BadRequestException(
                    'Image upload timeout. Please try with a smaller image or check your internet connection.'
                )
            }
            throw error
        }
    }

    @Get()
    @ApiOperation({
        summary: 'Get user groups',
        description: 'Get all groups the authenticated user is a member of'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of user groups',
        type: [Group]
    })
    async getUserGroups(@Request() req) {
        const data = await this.groupService.getUserGroups(req.user.uuid)
        return {
            statusCode: HttpStatus.OK,
            message: 'Groups fetched successfully',
            data
        }
    }

    @Get(':id/members')
    @ApiOperation({
        summary: 'Get group members',
        description: 'Get all members of a specific group'
    })
    @ApiParam({
        name: 'id',
        description: 'Group UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of group members',
        type: [GroupMember]
    })
    async getMembers(@Param('id') groupId: string) {
        const data = await this.groupService.getGroupMembers(groupId)
        return {
            statusCode: HttpStatus.OK,
            message: 'Group members fetched successfully',
            data
        }
    }

    @Post(':id/transfer-ownership')
    @ApiOperation({
        summary: 'Transfer group ownership',
        description: 'Transfer ownership of the group to another member'
    })
    @ApiParam({
        name: 'id',
        description: 'Group UUID'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                newOwnerId: {
                    type: 'string',
                    description: 'UUID of the new owner'
                }
            },
            required: ['newOwnerId']
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Ownership transferred successfully'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'You are not the owner of this group'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'New owner must be a member of the group'
    })
    async transferOwnership(
        @Request() req,
        @Param('id') groupId: string,
        @Body('newOwnerId') newOwnerId: string
    ) {
        const data = await this.groupService.transferOwnership(
            groupId,
            req.user.uuid,
            newOwnerId
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Ownership transferred successfully',
            data
        }
    }

    @Put(':id/settings')
    @ApiOperation({
        summary: 'Update group settings',
        description: 'Update group settings (requires manage group permission)'
    })
    @ApiParam({
        name: 'id',
        description: 'Group UUID'
    })
    @ApiBody({ type: UpdateGroupSettingsDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Settings updated successfully',
        type: GroupSettings
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'You do not have permission to manage group settings'
    })
    async updateSettings(
        @Request() req,
        @Param('id') groupId: string,
        @Body() settings: UpdateGroupSettingsDto
    ) {
        const data = await this.groupService.updateGroupSettings(
            groupId,
            req.user.uuid,
            settings
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Group settings updated successfully',
            data
        }
    }

    @Post(':id/members')
    @ApiOperation({
        summary: 'Add member to group',
        description:
            'Add a new member to the group (requires manage members permission)'
    })
    @ApiParam({
        name: 'id',
        description: 'Group UUID'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                userId: {
                    type: 'string',
                    description: 'UUID of the user to add'
                }
            },
            required: ['userId']
        }
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Member added successfully'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'You do not have permission to add members'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'User is already a member'
    })
    async addMember(
        @Request() req,
        @Param('id') groupId: string,
        @Body('userId') userId: string
    ) {
        const data = await this.groupService.addMember(
            groupId,
            req.user.uuid,
            userId
        )
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Member added successfully',
            data
        }
    }

    @Delete(':id/members/:memberId')
    @ApiOperation({
        summary: 'Remove member from group',
        description:
            'Remove a member from the group (requires kick members permission)'
    })
    @ApiParam({
        name: 'id',
        description: 'Group UUID'
    })
    @ApiParam({
        name: 'memberId',
        description: 'User UUID to remove'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Member removed successfully'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'You do not have permission to remove members'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Cannot remove the group owner'
    })
    async removeMember(
        @Request() req,
        @Param('id') groupId: string,
        @Param('memberId') memberId: string
    ) {
        const data = await this.groupService.removeMember(
            groupId,
            req.user.uuid,
            memberId
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Member removed successfully',
            data
        }
    }

    @Put(':id/members/:memberId/role')
    @ApiOperation({
        summary: 'Update member role',
        description: "Update a member's role (requires manage roles permission)"
    })
    @ApiParam({
        name: 'id',
        description: 'Group UUID'
    })
    @ApiParam({
        name: 'memberId',
        description: 'Member user UUID'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                roleId: {
                    type: 'string',
                    description: 'UUID of the new role'
                }
            },
            required: ['roleId']
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Role updated successfully'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'You do not have permission to manage roles'
    })
    async updateMemberRole(
        @Request() req,
        @Param('id') groupId: string,
        @Param('memberId') memberId: string,
        @Body('roleId') roleId: string
    ) {
        const data = await this.groupService.updateMemberRole(
            groupId,
            req.user.uuid,
            memberId,
            roleId
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Member role updated successfully',
            data
        }
    }

    @Post(':id/members/:memberId/mute')
    @ApiOperation({
        summary: 'Mute a member',
        description:
            'Mute a member in the group (requires manage members permission)'
    })
    @ApiParam({
        name: 'id',
        description: 'Group UUID'
    })
    @ApiParam({
        name: 'memberId',
        description: 'Member user UUID'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                duration: {
                    type: 'number',
                    description: 'Mute duration in minutes (optional)',
                    example: 60
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Member muted successfully'
    })
    async muteMember(
        @Request() req,
        @Param('id') groupId: string,
        @Param('memberId') memberId: string,
        @Body('duration') duration?: number
    ) {
        const data = await this.groupService.muteMember(
            groupId,
            req.user.uuid,
            memberId,
            duration
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Member muted successfully',
            data
        }
    }

    @Delete(':id/members/:memberId/mute')
    @ApiOperation({
        summary: 'Unmute a member',
        description:
            'Unmute a member in the group (requires manage members permission)'
    })
    @ApiParam({
        name: 'id',
        description: 'Group UUID'
    })
    @ApiParam({
        name: 'memberId',
        description: 'Member user UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Member unmuted successfully'
    })
    async unmuteMember(
        @Request() req,
        @Param('id') groupId: string,
        @Param('memberId') memberId: string
    ) {
        const data = await this.groupService.unmuteMember(
            groupId,
            req.user.uuid,
            memberId
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Member unmuted successfully',
            data
        }
    }

    @Post(':id/join')
    @ApiOperation({
        summary: 'Join a public group',
        description: 'Join a public group or private group with invite code'
    })
    @ApiParam({
        name: 'id',
        description: 'Group UUID'
    })
    @ApiQuery({
        name: 'inviteCode',
        required: false,
        description: 'Invite code for private groups'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Joined group successfully'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Invalid invite code'
    })
    async joinGroup(
        @Request() req,
        @Param('id') groupId: string,
        @Query('inviteCode') inviteCode?: string
    ) {
        const data = await this.groupService.joinPublicGroup(
            groupId,
            req.user.uuid,
            inviteCode
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Joined group successfully',
            data
        }
    }

    @Delete(':id/leave')
    @ApiOperation({
        summary: 'Leave a group',
        description: 'Leave a group you are a member of'
    })
    @ApiParam({
        name: 'id',
        description: 'Group UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Left group successfully'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Owner cannot leave the group. Transfer ownership first.'
    })
    async leaveGroup(@Request() req, @Param('id') groupId: string) {
        const data = await this.groupService.leaveGroup(groupId, req.user.uuid)
        return {
            statusCode: HttpStatus.OK,
            message: 'Left group successfully',
            data
        }
    }

    @Patch(':id/avatar')
    @ApiOperation({
        summary: 'Update group avatar',
        description:
            'Update the avatar of a group (requires manage group permission)'
    })
    @ApiParam({
        name: 'id',
        description: 'Group UUID'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                avatar: {
                    type: 'string',
                    format: 'binary',
                    description: 'Group avatar image file'
                }
            },
            required: ['avatar']
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Avatar updated successfully',
        type: Group
    })
    @UseInterceptors(
        FileInterceptor('avatar', {
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                    return cb(
                        new BadRequestException('Only image files are allowed'),
                        false
                    )
                }
                cb(null, true)
            },
            limits: {
                fileSize: 5 * 1024 * 1024 // 5MB limit
            }
        })
    )
    async updateGroupAvatar(
        @Request() req: any,
        @Param('id') groupId: string,
        @UploadedFile() avatarFile: Express.Multer.File
    ) {
        if (!avatarFile) {
            throw new BadRequestException('Avatar file is required')
        }

        const data = await this.groupService.updateGroupAvatar(
            groupId,
            req.user.uuid,
            avatarFile
        )
        return {
            statusCode: HttpStatus.OK,
            message: 'Group avatar updated successfully',
            data
        }
    }

    @Get('categories/:category')
    @ApiOperation({
        summary: 'Get groups by category',
        description:
            'Get groups categorized as Country, Popular, or Recommended'
    })
    @ApiParam({
        name: 'category',
        description: 'Group category',
        enum: GroupCategory
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of groups to return',
        example: 20
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Groups by category retrieved successfully',
        type: [Group]
    })
    async getGroupsByCategory(
        @Param('category') category: GroupCategory,
        @Query('limit') limit: number = 20
    ) {
        const data = await this.groupService.getGroupsByCategory(
            category,
            limit
        )
        return {
            statusCode: HttpStatus.OK,
            message: `${category} groups fetched successfully`,
            data
        }
    }

    @Get(':id/roles')
    @ApiOperation({
        summary: 'Get group roles',
        description: 'Get all roles available in a specific group'
    })
    @ApiParam({
        name: 'id',
        description: 'Group UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of group roles',
        type: [GroupRole]
    })
    async getRoles(@Param('id') groupId: string) {
        const data = await this.groupService.getGroupRoles(groupId)
        return {
            statusCode: HttpStatus.OK,
            message: 'Group roles fetched successfully',
            data
        }
    }
}
