import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Put,
    Request,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AssignRoomRoleDto, TransferOwnershipDto } from './dto/room-role.dto'
import { CreateCommentDto } from './dto/create-comment.dto'
import { CreateRoomDto } from './dto/create-room.dto'
import { JoinRoomDto } from './dto/join-room.dto'
import { UpdateRoomDto } from './dto/update-room.dto'
import { UploadRoomAvatarDto } from './dto/upload-room-avatar.dto'
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
                        roomId: {
                            type: 'string',
                            example: 'f560631b-1a55-45f7-ab0d-27b836bf245e'
                        },
                        roomName: {
                            type: 'string',
                            example: 'Dosti❤️Tak'
                        },
                        hostId: {
                            type: 'string',
                            example: 'u001'
                        },
                        participants: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    userId: { type: 'string', example: 'u001' },
                                    name: {
                                        type: 'string',
                                        example: 'HostUser'
                                    },
                                    avatar: {
                                        type: 'string',
                                        nullable: true,
                                        example:
                                            'https://i.pravatar.cc/150?img=1'
                                    },
                                    seatIndex: { type: 'number', example: 0 },
                                    isSpeaking: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    micOn: { type: 'boolean', example: true },
                                    role: {
                                        type: 'string',
                                        enum: [
                                            'host',
                                            'admin',
                                            'speaker',
                                            'guest'
                                        ],
                                        example: 'host'
                                    }
                                }
                            }
                        },
                        seats: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    index: { type: 'number', example: 0 },
                                    locked: { type: 'boolean', example: false },
                                    occupied: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    occupantUserId: {
                                        type: 'string',
                                        nullable: true,
                                        example: 'u001'
                                    }
                                }
                            }
                        },
                        maxSeats: { type: 'number', example: 8 },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-08-03T15:00:00Z'
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid group ID or user ID provided'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Group not found or user not found'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'You must be a member of the group to create a room'
    })
    async create(@Body() createRoomDto: CreateRoomDto, @Request() req: any) {
        try {
            const roomData = await this.roomService.createRoom(
                createRoomDto.groupId,
                createRoomDto,
                req.user
            )

            // Get the room details in the same format as getRoomByGroupId
            const roomDetails = await this.roomService.getRoomByGroupId(
                createRoomDto.groupId
            )

            return {
                statusCode: HttpStatus.CREATED,
                message: 'Room created successfully',
                data: roomDetails
            }
        } catch (error) {
            console.error('Room creation error:', error)

            if (error.message?.includes('foreign key constraint')) {
                throw new BadRequestException(
                    'Invalid group ID or user ID provided'
                )
            }

            if (error.status) {
                throw error
            }

            throw new BadRequestException(
                error.message || 'Failed to create room'
            )
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
        description: 'Room details with participants and seats',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Room details fetched successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        roomId: {
                            type: 'string',
                            example: 'f560631b-1a55-45f7-ab0d-27b836bf245e'
                        },
                        roomName: {
                            type: 'string',
                            example: 'Dosti❤️Tak'
                        },
                        hostId: {
                            type: 'string',
                            example: 'u001'
                        },
                        participants: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    userId: { type: 'string', example: 'u001' },
                                    name: {
                                        type: 'string',
                                        example: 'HostUser'
                                    },
                                    avatar: {
                                        type: 'string',
                                        nullable: true,
                                        example:
                                            'https://i.pravatar.cc/150?img=1'
                                    },
                                    seatIndex: { type: 'number', example: 0 },
                                    isSpeaking: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    micOn: { type: 'boolean', example: true },
                                    role: {
                                        type: 'string',
                                        enum: [
                                            'host',
                                            'admin',
                                            'speaker',
                                            'guest'
                                        ],
                                        example: 'host'
                                    }
                                }
                            }
                        },
                        seats: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    index: { type: 'number', example: 0 },
                                    locked: { type: 'boolean', example: false },
                                    occupied: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    occupantUserId: {
                                        type: 'string',
                                        nullable: true,
                                        example: 'u001'
                                    }
                                }
                            }
                        },
                        maxSeats: { type: 'number', example: 8 },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-08-03T15:00:00Z'
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

    @Get(':id/details')
    @ApiOperation({
        summary: 'Get room details by room ID',
        description:
            'Get comprehensive room information including owner, host, members, and room settings'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Room details with participants and seats',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Room details fetched successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        roomId: {
                            type: 'string',
                            example: 'f560631b-1a55-45f7-ab0d-27b836bf245e'
                        },
                        roomName: {
                            type: 'string',
                            example: 'Dosti❤️Tak'
                        },
                        hostId: {
                            type: 'string',
                            example: 'u001'
                        },
                        participants: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    userId: { type: 'string', example: 'u001' },
                                    name: {
                                        type: 'string',
                                        example: 'HostUser'
                                    },
                                    avatar: {
                                        type: 'string',
                                        nullable: true,
                                        example:
                                            'https://i.pravatar.cc/150?img=1'
                                    },
                                    seatIndex: { type: 'number', example: 0 },
                                    isSpeaking: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    micOn: { type: 'boolean', example: true },
                                    role: {
                                        type: 'string',
                                        enum: [
                                            'host',
                                            'admin',
                                            'speaker',
                                            'guest'
                                        ],
                                        example: 'host'
                                    }
                                }
                            }
                        },
                        seats: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    index: { type: 'number', example: 0 },
                                    locked: { type: 'boolean', example: false },
                                    occupied: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    occupantUserId: {
                                        type: 'string',
                                        nullable: true,
                                        example: 'u001'
                                    }
                                }
                            }
                        },
                        maxSeats: { type: 'number', example: 8 },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2025-08-03T15:00:00Z'
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Room not found'
    })
    async getRoomDetails(@Param('id') roomId: string) {
        const data = await this.roomService.getRoomDetails(roomId)
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
        description: 'Retrieve comments for a specific room'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
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
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            _id: {
                                type: 'string',
                                example: '64a7e14f4f5e123456789abc'
                            },
                            senderId: { type: 'string', example: 'user_001' },
                            senderName: { type: 'string', example: 'Alice' },
                            senderImage: {
                                type: 'string',
                                nullable: true,
                                example: 'https://example.com/avatar.jpg'
                            },
                            content: {
                                type: 'string',
                                example: 'This is a comment!'
                            },
                            createdAt: {
                                type: 'string',
                                format: 'date-time',
                                example: '2025-08-02T10:45:00Z'
                            }
                        }
                    }
                }
            }
        }
    })
    async getRoomComments(@Param('id') roomId: string) {
        try {
            const comments = await this.roomService.getRoomComments(roomId)
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

    @Post('comments')
    @ApiOperation({
        summary: 'Create a room comment',
        description: 'Post a comment to a specific room'
    })
    @ApiBody({ type: CreateCommentDto })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Comment posted successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                message: {
                    type: 'string',
                    example: 'Comment posted successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        uuid: { type: 'string' },
                        roomId: { type: 'string' },
                        userId: { type: 'string' },
                        message: { type: 'string' },
                        messageType: { type: 'string', example: 'text' },
                        createdAt: { type: 'string', format: 'date-time' },
                        user: {
                            type: 'object',
                            properties: {
                                uuid: { type: 'string' },
                                name: { type: 'string' },
                                avatarUrl: { type: 'string', nullable: true }
                            }
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid room ID or comment content'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Room not found'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'User not authorized to comment in this room'
    })
    async createRoomComment(
        @Body() createCommentDto: CreateCommentDto,
        @Request() req: any
    ) {
        try {
            const userId = req.user.uuid
            const { room: roomId, content } = createCommentDto

            const comment = await this.roomService.addRoomComment(
                roomId,
                userId,
                content
            )

            return {
                statusCode: HttpStatus.CREATED,
                message: 'Comment posted successfully',
                data: comment
            }
        } catch (error) {
            throw new HttpException(
                {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: error.message || 'Failed to post comment'
                },
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @Post('upload-avatar')
    @ApiOperation({
        summary: 'Upload room avatar',
        description:
            'Upload an avatar image for a room. Only room owner, host, or admin can upload.'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'Room avatar upload',
        schema: {
            type: 'object',
            properties: {
                roomId: {
                    type: 'string',
                    description: 'Room UUID',
                    example: '123e4567-e89b-12d3-a456-426614174000'
                },
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Room avatar image file'
                }
            },
            required: ['roomId', 'file']
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Room avatar uploaded successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Room avatar uploaded successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        roomAvatarUrl: {
                            type: 'string',
                            example:
                                'https://res.cloudinary.com/kitty/image/upload/v1234567890/rooms/room-avatar.jpg'
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid file type or size, or missing required fields'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Insufficient permissions to update room avatar'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Room not found'
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadRoomAvatar(
        @UploadedFile() file: Express.Multer.File,
        @Body('roomId') roomId: string,
        @Request() req: any
    ) {
        try {
            if (!file) {
                throw new BadRequestException('No file uploaded')
            }

            if (!roomId) {
                throw new BadRequestException('Room ID is required')
            }

            const result = await this.roomService.uploadRoomAvatar(
                roomId,
                file,
                req.user.uuid
            )

            return {
                statusCode: HttpStatus.OK,
                message: 'Room avatar uploaded successfully',
                data: result
            }
        } catch (error) {
            throw new HttpException(
                {
                    statusCode: error.status || HttpStatus.BAD_REQUEST,
                    message: error.message || 'Failed to upload room avatar'
                },
                error.status || HttpStatus.BAD_REQUEST
            )
        }
    }

    @Get('recommended')
    @ApiOperation({
        summary: 'Get recommended rooms',
        description:
            'Get a list of all active rooms with their details, similar to getRoomByGroupId format but as an array'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of recommended rooms',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Recommended rooms fetched successfully'
                },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            _id: { type: 'string' },
                            name: { type: 'string' },
                            description: { type: 'string' },
                            country: { type: 'string' },
                            roomAvatarUrl: { type: 'string', nullable: true },
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
                }
            }
        }
    })
    async getRecommendedRooms() {
        try {
            const rooms = await this.roomService.getRecommendedRooms()

            return {
                statusCode: HttpStatus.OK,
                message: 'Recommended rooms fetched successfully',
                data: rooms
            }
        } catch (error) {
            throw new HttpException(
                {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message:
                        error.message || 'Failed to fetch recommended rooms'
                },
                HttpStatus.BAD_REQUEST
            )
        }
    }
}
