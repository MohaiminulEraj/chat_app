import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
    Request,
    UseGuards
} from '@nestjs/common'
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AssignRoomRoleDto, TransferOwnershipDto } from './dto/room-role.dto'
import { CreateRoomDto } from './dto/create-room.dto'
import { JoinRoomDto } from './dto/join-room.dto'
import { UpdateRoomDto } from './dto/update-room.dto'
import { RoomParticipant } from './entities/room-participant.entity'
import { RoomRole } from './entities/room-role.entity'
import { RoomWaitingList } from './entities/room-waiting-list.entity'
import { Room } from './entities/room.entity'
import { RoomService } from './room.service'

@ApiTags('🎮 Rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoomController {
    constructor(private readonly roomService: RoomService) {}

    @Post()
    @ApiOperation({
        summary: 'Create a new room',
        description: 'Create a new voice/game room for a group'
    })
    @ApiBody({ type: CreateRoomDto })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Room created successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                message: {
                    type: 'string',
                    example: 'Room created successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        uuid: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        type: {
                            type: 'string',
                            enum: ['public', 'private', 'group', 'voice']
                        },
                        groupId: { type: 'string' },
                        ownerId: { type: 'string' },
                        capacity: { type: 'number' },
                        maxSeats: { type: 'number' },
                        isLocked: { type: 'boolean' },
                        password: { type: 'string', nullable: true },
                        isActive: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    async create(@Body() createRoomDto: CreateRoomDto, @Request() req: any) {
        const data = await this.roomService.createRoom(
            createRoomDto.groupId,
            createRoomDto,
            req.user
        )
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Room created successfully',
            data
        }
    }

    @Get(':groupId/group-room')
    @ApiOperation({
        summary: 'Get room details by group ID',
        description:
            'Get room information including owner, host, and members for a specific group'
    })
    @ApiParam({
        name: 'groupId',
        description: 'Group UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Room details with owner, host, and members',
        schema: {
            type: 'object',
            properties: {
                _id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                country: { type: 'string' },
                roomOwner: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        uuid: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        phoneNumber: { type: 'string' },
                        userType: { type: 'string' },
                        authProvider: { type: 'string' },
                        avatarUrl: { type: 'string' },
                        isEmailVerified: { type: 'boolean' },
                        isPhoneVerified: { type: 'boolean' }
                    }
                },
                host: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        uuid: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        phoneNumber: { type: 'string' },
                        userType: { type: 'string' },
                        authProvider: { type: 'string' },
                        avatarUrl: { type: 'string' },
                        isEmailVerified: { type: 'boolean' },
                        isPhoneVerified: { type: 'boolean' }
                    }
                },
                members: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            _id: { type: 'string' },
                            name: { type: 'string' },
                            email: { type: 'string' },
                            image: { type: 'string' },
                            role: {
                                type: 'string',
                                enum: [
                                    'owner',
                                    'host',
                                    'admin',
                                    'speaker',
                                    'listener'
                                ]
                            },
                            status: { type: 'boolean' },
                            join: { type: 'boolean' },
                            invitedBy: { type: 'string' },
                            blocked: { type: 'boolean' }
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Room not found for the specified group'
    })
    async getRoomByGroupId(@Param('groupId') groupId: string) {
        const data = await this.roomService.getRoomByGroupId(groupId)
        return {
            statusCode: HttpStatus.OK,
            message: 'Room details fetched successfully',
            data
        }
    }

    @Get(':id/participants')
    @ApiOperation({
        summary: 'Get room participants',
        description: 'Get all participants currently in the room'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of room participants',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Room participants fetched successfully'
                },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'number' },
                            uuid: { type: 'string' },
                            userId: { type: 'string' },
                            roomId: { type: 'string' },
                            joinedAt: { type: 'string', format: 'date-time' },
                            isActive: { type: 'boolean' }
                        }
                    }
                }
            }
        }
    })
    async getParticipants(@Param('id') roomId: string) {
        const data = await this.roomService.getRoomParticipants(roomId)
        return {
            statusCode: HttpStatus.OK,
            message: 'Room participants fetched successfully',
            data
        }
    }

    @Get(':id/waiting-list')
    @ApiOperation({
        summary: 'Get room waiting list',
        description: 'Get users in the waiting list for a full room'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of users in waiting list',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Waiting list fetched successfully'
                },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'number' },
                            uuid: { type: 'string' },
                            userId: { type: 'string' },
                            roomId: { type: 'string' },
                            position: { type: 'number' },
                            createdAt: { type: 'string', format: 'date-time' }
                        }
                    }
                }
            }
        }
    })
    async getWaitingList(@Param('id') roomId: string) {
        const data = await this.roomService.getRoomWaitingList(roomId)
        return {
            statusCode: HttpStatus.OK,
            message: 'Waiting list fetched successfully',
            data
        }
    }

    @Post(':id/join')
    @ApiOperation({
        summary: 'Join a room',
        description:
            'Join a room. If the room is private, a password is required.'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiBody({ type: JoinRoomDto })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Successfully joined the room',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                message: {
                    type: 'string',
                    example: 'Successfully joined the room'
                },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        uuid: { type: 'string' },
                        userId: { type: 'string' },
                        roomId: { type: 'string' },
                        joinedAt: { type: 'string', format: 'date-time' },
                        isActive: { type: 'boolean' }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Invalid password for private room'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Room is full'
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'User is already in the room'
    })
    async joinRoom(
        @Param('id') roomId: string,
        @Body() joinRoomDto: JoinRoomDto,
        @Request() req: any
    ) {
        const data = await this.roomService.joinRoom(
            roomId,
            req.user.uuid,
            joinRoomDto.password
        )
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Successfully joined the room',
            data
        }
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update room',
        description: 'Update room settings and configuration'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiBody({ type: UpdateRoomDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Room updated successfully',
        type: Room
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Room not found'
    })
    update(@Param('id') roomId: string, @Body() updateRoomDto: UpdateRoomDto) {
        return this.roomService.updateRoom(roomId, updateRoomDto)
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete room',
        description: 'Delete a room (soft delete - sets isActive to false)'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Room deleted successfully'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Room not found'
    })
    delete(@Param('id') roomId: string) {
        return this.roomService.deleteRoom(roomId)
    }

    @Post(':id/assign-role')
    @ApiOperation({
        summary: 'Assign role to user in room',
        description:
            'Assign a specific role to a user in the room. Only room owner/admin can assign roles.'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiBody({ type: AssignRoomRoleDto })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Role assigned successfully'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Insufficient permissions to assign role'
    })
    assignRole(
        @Param('id') roomId: string,
        @Body() assignRoleDto: AssignRoomRoleDto,
        @Request() req: any
    ) {
        return this.roomService.assignRoomRole(
            roomId,
            assignRoleDto.userId,
            assignRoleDto.role,
            req.user.uuid
        )
    }

    @Post(':id/transfer-ownership')
    @ApiOperation({
        summary: 'Transfer room ownership',
        description:
            'Transfer room ownership to another user. Only current owner can transfer ownership.'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiBody({ type: TransferOwnershipDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Ownership transferred successfully'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Only room owner can transfer ownership'
    })
    transferOwnership(
        @Param('id') roomId: string,
        @Body() transferDto: TransferOwnershipDto,
        @Request() req: any
    ) {
        return this.roomService.transferRoomOwnership(
            roomId,
            transferDto.newOwnerId,
            req.user.uuid
        )
    }

    @Get(':id/roles/:userId')
    @ApiOperation({
        summary: 'Get user roles in room',
        description: 'Get all roles assigned to a specific user in the room'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiParam({
        name: 'userId',
        description: 'User UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of user roles',
        schema: {
            type: 'array',
            items: {
                type: 'string',
                enum: Object.values(RoomRole)
            }
        }
    })
    getUserRoles(@Param('id') roomId: string, @Param('userId') userId: string) {
        return this.roomService.getUserRolesInRoom(roomId, userId)
    }

    @Get(':id/comments')
    @ApiOperation({
        summary: 'Get room comments',
        description: 'Retrieve paginated comments for a specific room'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiQuery({
        name: 'page',
        required: false,
        description: 'Page number for pagination (default: 1)',
        type: Number
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of comments per page (default: 20)',
        type: Number
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Room comments retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Room comments retrieved successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        comments: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    message: { type: 'string' },
                                    messageType: { type: 'string' },
                                    createdAt: {
                                        type: 'string',
                                        format: 'date-time'
                                    },
                                    user: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' },
                                            displayName: { type: 'string' },
                                            avatarUrl: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                page: { type: 'number' },
                                limit: { type: 'number' },
                                total: { type: 'number' },
                                totalPages: { type: 'number' }
                            }
                        }
                    }
                }
            }
        }
    })
    async getRoomComments(
        @Param('id') roomId: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 20
    ) {
        try {
            const comments = await this.roomService.getRoomComments(
                roomId,
                page,
                limit
            )
            return {
                statusCode: HttpStatus.OK,
                message: 'Room comments retrieved successfully',
                data: comments
            }
        } catch (error) {
            throw new HttpException(
                {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: error.message || 'Failed to retrieve room comments'
                },
                HttpStatus.BAD_REQUEST
            )
        }
    }
}
