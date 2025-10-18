import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    Query,
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
import { CreateRoomMultipartDto } from './dto/create-room-multipart.dto'
import {
    CreatePKBattleDto,
    ApprovePKBattleDto,
    StartPKBattleDto,
    SendPKBattleGiftDto,
    PKBattleParticipantResponseDto,
    GetPKBattleStatsDto,
    CancelPKBattleDto
} from './dto/pk-battle.dto'
import {
    JoinRoomWithSeatDto,
    ToggleSeatLockDto
} from './dto/seat-management.dto'
import { JoinRoomDto } from './dto/join-room.dto'
import { UpdateRoomDto, UpdateRoomWithFileDto } from './dto/update-room.dto'
import { UploadRoomAvatarDto } from './dto/upload-room-avatar.dto'
import { RoomParticipant } from './entities/room-participant.entity'
import { RoomRole } from './entities/room-role.entity'
import { RoomWaitingList } from './entities/room-waiting-list.entity'
import { Room } from './entities/room.entity'
import { RoomGateway } from './room.gateway'
import { RoomService } from './room.service'
import { TaskService } from '../task/task.service'

@ApiTags('🎮 Rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoomController {
    constructor(
        private readonly roomService: RoomService,
        private readonly roomGateway: RoomGateway,
        private readonly taskService: TaskService
    ) {}

    @Post()
    @ApiOperation({
        summary: 'Create a new room',
        description:
            'Create a new voice/game room for a group with optional avatar upload'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                groupId: {
                    type: 'string',
                    example: '123e4567-e89b-12d3-a456-426614174000',
                    description: 'The UUID of the group this room belongs to'
                },
                name: {
                    type: 'string',
                    example: 'Gaming Room #1',
                    description: 'Name of the room'
                },
                description: {
                    type: 'string',
                    example: 'A room for playing games together',
                    description: 'Description of the room'
                },
                maxSeats: {
                    type: 'number',
                    example: 8,
                    enum: [6, 8, 10],
                    description: 'Maximum number of seats in the room'
                },
                isPrivate: {
                    type: 'boolean',
                    example: false,
                    description:
                        'Whether the room is private (requires password)'
                },
                password: {
                    type: 'string',
                    example: 'mySecretPassword',
                    description:
                        'Password for private rooms (required if isPrivate is true)'
                },
                type: {
                    type: 'string',
                    enum: ['public', 'private', 'group', 'voice'],
                    example: 'voice',
                    description: 'The type of the room'
                },
                avatar: {
                    type: 'string',
                    format: 'binary',
                    description: 'Room avatar image file (optional)'
                }
            },
            required: ['groupId', 'name']
        }
    })
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
                        description: {
                            type: 'string',
                            nullable: true,
                            example: 'Chill voice hangout room'
                        },
                        level: { type: 'number', example: 0 },
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
                        roomAvatarUrl: {
                            type: 'string',
                            nullable: true,
                            example:
                                'https://res.cloudinary.com/kitty/image/upload/v1234567890/rooms/room-avatar.jpg'
                        },
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
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid file type or size for avatar upload'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Group not found or user not found'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'You must be a member of the group to create a room'
    })
    @UseInterceptors(FileInterceptor('avatar'))
    async create(
        @Body() createRoomDto: CreateRoomMultipartDto,
        @Request() req: any,
        @UploadedFile() avatarFile?: Express.Multer.File
    ) {
        try {
            const roomData = await this.roomService.createRoom(
                createRoomDto.groupId,
                createRoomDto,
                req.user,
                avatarFile
            )

            // Get the room details for the specific room that was just created
            const roomDetails = await this.roomService.getRoomDetails(
                roomData.uuid
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
            'Get room information including owner, host, and members for a specific group. Host information is returned separately and excluded from participants array.'
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
                        description: {
                            type: 'string',
                            nullable: true,
                            example: 'Chill voice hangout room'
                        },
                        level: { type: 'number', example: 3 },
                        hostId: {
                            type: 'string',
                            example: 'u001'
                        },
                        hostName: {
                            type: 'string',
                            example: 'John Doe'
                        },
                        hostImage: {
                            type: 'string',
                            nullable: true,
                            example: 'https://i.pravatar.cc/150?img=1'
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
            'Get comprehensive room information including owner, host, members, and room settings. Host information is returned separately and excluded from participants array.'
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
                        hostName: {
                            type: 'string',
                            example: 'John Doe'
                        },
                        hostImage: {
                            type: 'string',
                            nullable: true,
                            example: 'https://i.pravatar.cc/150?img=1'
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
            'Join a room with optional seat selection. If the room is private, a password is required. Seat 0 is reserved for host/owner.'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiBody({ type: JoinRoomWithSeatDto })
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
                        participant: {
                            type: 'object',
                            properties: {
                                id: { type: 'number' },
                                uuid: { type: 'string' },
                                userId: { type: 'string' },
                                roomId: { type: 'string' },
                                seatNumber: { type: 'number' },
                                joinedAt: {
                                    type: 'string',
                                    format: 'date-time'
                                },
                                isActive: { type: 'boolean' }
                            }
                        },
                        seatIndex: {
                            type: 'number',
                            example: 1,
                            description: '0-based seat index'
                        },
                        seats: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    index: { type: 'number' },
                                    locked: { type: 'boolean' },
                                    occupied: { type: 'boolean' },
                                    occupantUserId: {
                                        type: 'string',
                                        nullable: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description:
            'Invalid password for private room or seat 0 reserved for host'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Room is full or seat is locked/occupied'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description:
            'User was already in the room - returns existing participant info'
    })
    async joinRoom(
        @Param('id') roomId: string,
        @Body() joinRoomDto: JoinRoomWithSeatDto,
        @Request() req: any
    ) {
        const participant = await this.roomService.joinRoom(
            roomId,
            req.user.uuid,
            joinRoomDto.password,
            joinRoomDto.seatNumber
        )

        // Get updated seat information
        const seats = await this.roomService.getRoomSeats(roomId)

        // Check if this was an existing participant (joinedAt would be older)
        const isExistingParticipant =
            participant.joinedAt &&
            new Date().getTime() - new Date(participant.joinedAt).getTime() >
                1000 // More than 1 second old

        return {
            statusCode: isExistingParticipant
                ? HttpStatus.OK
                : HttpStatus.CREATED,
            message: isExistingParticipant
                ? 'You are already in this room'
                : 'Successfully joined the room',
            data: {
                participant,
                seatIndex: participant.seatNumber - 1, // Convert to 0-based
                seats,
                isExistingParticipant
            }
        }
    }

    @Patch(':id')
    @ApiOperation({
        summary: 'Update room',
        description:
            'Update room settings and configuration with optional avatar upload'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({ type: UpdateRoomWithFileDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Room updated successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Room updated successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        type: { type: 'string' },
                        maxSeats: { type: 'number' },
                        isLocked: { type: 'boolean' },
                        isActive: { type: 'boolean' },
                        roomAvatarUrl: { type: 'string', nullable: true },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Room not found'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid room data or file upload error'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Insufficient permissions to update room'
    })
    @UseInterceptors(FileInterceptor('file'))
    async update(
        @Param('id') roomId: string,
        @Body() updateRoomDto: UpdateRoomWithFileDto,
        @UploadedFile() file?: Express.Multer.File,
        @Request() req?: any
    ) {
        try {
            const currentUserId = req.user?.uuid || req.user?.id

            if (!currentUserId) {
                throw new BadRequestException('User ID is required')
            }

            // Prepare update data
            const updateData: any = { ...updateRoomDto }

            // Handle file upload if provided
            if (file) {
                const avatarResult = await this.roomService.uploadRoomAvatar(
                    roomId,
                    file,
                    currentUserId
                )
                updateData.roomAvatarUrl = avatarResult.roomAvatarUrl
            }

            // Remove file from update data as it's handled separately
            delete updateData.file

            const updatedRoom = await this.roomService.updateRoom(
                roomId,
                updateData
            )

            return {
                statusCode: HttpStatus.OK,
                message: 'Room updated successfully',
                data: updatedRoom
            }
        } catch (error) {
            if (error instanceof HttpException) {
                throw error
            }
            throw new BadRequestException(
                error.message || 'Failed to update room'
            )
        }
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
    async delete(@Param('id') roomId: string) {
        return await this.roomService.deleteRoom(roomId)
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
    async assignRole(
        @Param('id') roomId: string,
        @Body() assignRoleDto: AssignRoomRoleDto,
        @Request() req: any
    ) {
        return await this.roomService.assignRoomRole(
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
    async transferOwnership(
        @Param('id') roomId: string,
        @Body() transferDto: TransferOwnershipDto,
        @Request() req: any
    ) {
        return await this.roomService.transferRoomOwnership(
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
    async getUserRoles(
        @Param('id') roomId: string,
        @Param('userId') userId: string
    ) {
        return await this.roomService.getUserRolesInRoom(roomId, userId)
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

            // Emit real-time comment event to all room participants
            try {
                const roomName = `room:${roomId}`
                this.roomGateway.server.to(roomName).emit('ReceivedComment', {
                    content: content,
                    senderId: userId,
                    senderName:
                        req.user.name || req.user.email || 'Unknown User',
                    senderImage: req.user.avatarUrl || null,
                    createdAt: comment.createdAt || new Date().toISOString(),
                    roomId: roomId,
                    commentId: comment.uuid,
                    messageType: 'text',
                    replyToId: null,
                    metadata: null,
                    source: 'api' // Indicate this comment came from API
                })
            } catch (socketError) {
                // Log socket error but don't fail the API response
                console.error(
                    'Failed to emit real-time comment event:',
                    socketError
                )
            }

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
                            level: { type: 'number', example: 2 },
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
    async getRecommendedRooms(@Query('userId') userId?: string) {
        try {
            const rooms = await this.roomService.getRecommendedRooms(userId)

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

    @Get('popular')
    @ApiOperation({
        summary: 'Get popular rooms',
        description:
            'Get a list of rooms sorted by popularity based on user activity. Popular rooms are determined by how frequently users visit them, with recent activity weighted higher.'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of popular rooms',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Popular rooms fetched successfully'
                },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            _id: { type: 'string' },
                            name: { type: 'string' },
                            description: { type: 'string' },
                            level: { type: 'number', example: 2 },
                            country: { type: 'string' },
                            roomAvatarUrl: { type: 'string', nullable: true },
                            popularity: {
                                type: 'object',
                                properties: {
                                    totalVisits: {
                                        type: 'number',
                                        example: 45
                                    },
                                    uniqueVisitors: {
                                        type: 'number',
                                        example: 12
                                    },
                                    popularityScore: {
                                        type: 'number',
                                        example: 15.5
                                    }
                                }
                            },
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
    async getPopularRooms() {
        try {
            const rooms = await this.roomService.getPopularRooms()

            return {
                statusCode: HttpStatus.OK,
                message: 'Popular rooms fetched successfully',
                data: rooms
            }
        } catch (error) {
            throw new HttpException(
                {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: error.message || 'Failed to fetch popular rooms'
                },
                HttpStatus.BAD_REQUEST
            )
        }
    }

    // ==================== SEAT MANAGEMENT ENDPOINTS ====================

    @Get(':id/seats')
    @ApiOperation({
        summary: 'Get room seats',
        description:
            'Get current seat state for a room including lock status and occupancy'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Room seats retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Room seats retrieved successfully'
                },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            index: {
                                type: 'number',
                                example: 0,
                                description: '0-based seat index'
                            },
                            locked: { type: 'boolean', example: false },
                            occupied: { type: 'boolean', example: true },
                            occupantUserId: {
                                type: 'string',
                                nullable: true,
                                example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
                            }
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
    async getRoomSeats(@Param('id') roomId: string) {
        try {
            const seats = await this.roomService.getRoomSeats(roomId)
            return {
                statusCode: HttpStatus.OK,
                message: 'Room seats retrieved successfully',
                data: seats
            }
        } catch (error) {
            throw new HttpException(
                {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: error.message || 'Failed to retrieve room seats'
                },
                HttpStatus.BAD_REQUEST
            )
        }
    }

    @Post(':id/seats/toggle-lock')
    @ApiOperation({
        summary: 'Toggle seat lock status',
        description:
            'Lock or unlock a specific seat. Only room host/owner can perform this action.'
    })
    @ApiParam({
        name: 'id',
        description: 'Room UUID'
    })
    @ApiBody({ type: ToggleSeatLockDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Seat lock status updated successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Seat lock status updated successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        seatIndex: { type: 'number', example: 3 },
                        isLocked: { type: 'boolean', example: true },
                        seats: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    index: { type: 'number' },
                                    locked: { type: 'boolean' },
                                    occupied: { type: 'boolean' },
                                    occupantUserId: {
                                        type: 'string',
                                        nullable: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Only room owner or host can lock/unlock seats'
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Cannot lock occupied seat or invalid seat index'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Room not found'
    })
    async toggleSeatLock(
        @Param('id') roomId: string,
        @Body() toggleSeatLockDto: ToggleSeatLockDto,
        @Request() req: any
    ) {
        try {
            const result = await this.roomService.toggleSeatLock(
                roomId,
                toggleSeatLockDto.seatIndex,
                toggleSeatLockDto.isLocked,
                req.user.uuid
            )

            // Get updated seat information
            const seats = await this.roomService.getRoomSeats(roomId)

            return {
                statusCode: HttpStatus.OK,
                message: 'Seat lock status updated successfully',
                data: {
                    ...result,
                    seats
                }
            }
        } catch (error) {
            if (
                error.message.includes('permission') ||
                error.message.includes('Only')
            ) {
                throw new HttpException(
                    {
                        statusCode: HttpStatus.FORBIDDEN,
                        message: error.message
                    },
                    HttpStatus.FORBIDDEN
                )
            }

            throw new HttpException(
                {
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: error.message || 'Failed to toggle seat lock'
                },
                HttpStatus.BAD_REQUEST
            )
        }
    }

    // ==================== PK BATTLE ENDPOINTS ====================

    @Post('pk-battles')
    @ApiOperation({
        summary: 'Create a new PK Battle',
        description:
            'Host creates a PK Battle between two participants with specified duration'
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'PK Battle created successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                message: {
                    type: 'string',
                    example: 'PK Battle created successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        battleId: {
                            type: 'string',
                            example: 'b82bef5b-443e-5e7a-c80c-227f4773h8h0'
                        },
                        roomId: {
                            type: 'string',
                            example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
                        },
                        hostId: { type: 'string', example: 'host-uuid' },
                        battleType: {
                            type: 'string',
                            example: 'host_selected'
                        },
                        status: { type: 'string', example: 'pending' },
                        duration: { type: 'number', example: 300 },
                        participants: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    userId: { type: 'string' },
                                    name: { type: 'string' },
                                    position: { type: 'number' },
                                    status: {
                                        type: 'string',
                                        example: 'invited'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid request data'
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'Insufficient permissions'
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Active battle already exists'
    })
    async createPKBattle(
        @Body() createBattleDto: CreatePKBattleDto,
        @Request() req: any
    ) {
        try {
            const battle = await this.roomService.createPKBattle(
                createBattleDto.roomId,
                req.user.uuid,
                createBattleDto.participantIds,
                createBattleDto.durationMinutes,
                createBattleDto.battleType,
                createBattleDto.description,
                createBattleDto.metadata
            )

            // Get complete battle details using the same structure as getActivePKBattle
            const battleDetails = battle
                ? await this.roomService.getPKBattleDetails(battle.uuid)
                : null

            return {
                statusCode: HttpStatus.CREATED,
                message: 'PK Battle created successfully',
                data: battleDetails
            }
        } catch (error) {
            if (error.status) throw error
            throw new BadRequestException(
                error.message || 'Failed to create PK battle'
            )
        }
    }

    @Post('pk-battles/:battleId/approve')
    @ApiOperation({
        summary: 'Approve or reject a PK Battle',
        description: 'Host approves or rejects a pending PK Battle'
    })
    @ApiParam({ name: 'battleId', description: 'PK Battle UUID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'PK Battle approval status updated',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'PK Battle approved successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        battleId: { type: 'string' },
                        status: { type: 'string', example: 'approved' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    async approvePKBattle(
        @Param('battleId') battleId: string,
        @Body() approveDto: ApprovePKBattleDto,
        @Request() req: any
    ) {
        try {
            const battle = await this.roomService.approvePKBattle(
                battleId,
                req.user.uuid,
                approveDto.approved,
                approveDto.reason
            )

            return {
                statusCode: HttpStatus.OK,
                message: `PK Battle ${approveDto.approved ? 'approved' : 'rejected'} successfully`,
                data: {
                    battleId: battle.uuid,
                    status: battle.status,
                    updatedAt: battle.updatedAt
                }
            }
        } catch (error) {
            if (error.status) throw error
            throw new BadRequestException(
                error.message || 'Failed to update battle approval'
            )
        }
    }

    @Post('pk-battles/:battleId/start')
    @ApiOperation({
        summary: 'Start a PK Battle',
        description: 'Host starts an approved PK Battle'
    })
    @ApiParam({ name: 'battleId', description: 'PK Battle UUID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'PK Battle started successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'PK Battle started successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        battleId: { type: 'string' },
                        status: { type: 'string', example: 'active' },
                        startTime: { type: 'string', format: 'date-time' },
                        endTime: { type: 'string', format: 'date-time' },
                        remainingTime: { type: 'number', example: 300 }
                    }
                }
            }
        }
    })
    async startPKBattle(
        @Param('battleId') battleId: string,
        @Request() req: any
    ) {
        try {
            const battle = await this.roomService.startPKBattle(
                battleId,
                req.user.uuid
            )

            const remainingTime = battle.endTime
                ? Math.max(
                      0,
                      Math.floor(
                          (battle.endTime.getTime() - new Date().getTime()) /
                              1000
                      )
                  )
                : 0

            return {
                statusCode: HttpStatus.OK,
                message: 'PK Battle started successfully',
                data: {
                    battleId: battle.uuid,
                    status: battle.status,
                    startTime: battle.startTime,
                    endTime: battle.endTime,
                    remainingTime
                }
            }
        } catch (error) {
            if (error.status) throw error
            throw new BadRequestException(
                error.message || 'Failed to start PK battle'
            )
        }
    }

    @Post('pk-battles/:battleId/respond')
    @ApiOperation({
        summary: 'Respond to PK Battle invitation',
        description: 'Participant accepts or declines a PK Battle invitation'
    })
    @ApiParam({ name: 'battleId', description: 'PK Battle UUID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Response recorded successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'Battle invitation accepted'
                },
                data: {
                    type: 'object',
                    properties: {
                        battleId: { type: 'string' },
                        userId: { type: 'string' },
                        status: { type: 'string', example: 'accepted' }
                    }
                }
            }
        }
    })
    async respondToPKBattle(
        @Param('battleId') battleId: string,
        @Body() responseDto: PKBattleParticipantResponseDto,
        @Request() req: any
    ) {
        try {
            const participant = await this.roomService.respondToPKBattle(
                battleId,
                req.user.uuid,
                responseDto.accepted
            )

            return {
                statusCode: HttpStatus.OK,
                message: `Battle invitation ${responseDto.accepted ? 'accepted' : 'declined'}`,
                data: {
                    battleId: participant.battleId,
                    userId: participant.userId,
                    status: participant.status
                }
            }
        } catch (error) {
            if (error.status) throw error
            throw new BadRequestException(
                error.message || 'Failed to respond to battle invitation'
            )
        }
    }

    @Post('pk-battles/:battleId/gifts')
    @ApiOperation({
        summary: 'Send gift to PK Battle participant',
        description:
            'Send a gift to a specific participant during an active PK Battle'
    })
    @ApiParam({ name: 'battleId', description: 'PK Battle UUID' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                giftId: {
                    type: 'string',
                    description: 'UUID of gift',
                    example: 'c93cef6c-554f-6f8b-d91d-338g5884i9i1'
                },
                receiverId: {
                    type: 'string',
                    description:
                        'Participant user ID who will receive the gift',
                    example: 'user1-uuid'
                },
                quantity: {
                    type: 'number',
                    description: 'Number of gifts to send',
                    example: 1,
                    minimum: 1,
                    maximum: 100
                },
                message: {
                    type: 'string',
                    description: 'Optional message with the gift',
                    example: 'You can do it! 🔥'
                }
            },
            required: ['giftId', 'receiverId', 'quantity']
        }
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Gift sent successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 201 },
                message: { type: 'string', example: 'Gift sent successfully' },
                data: {
                    type: 'object',
                    properties: {
                        giftId: { type: 'string' },
                        battleId: { type: 'string' },
                        senderName: { type: 'string' },
                        receiverName: { type: 'string' },
                        giftName: { type: 'string' },
                        quantity: { type: 'number' },
                        totalValue: { type: 'number' },
                        message: { type: 'string' },
                        sentAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        }
    })
    async sendPKBattleGift(
        @Param('battleId') battleId: string,
        @Body() giftDto: SendPKBattleGiftDto,
        @Request() req: any
    ) {
        try {
            const battleGift = await this.roomService.sendPKBattleGift(
                battleId,
                giftDto.giftId,
                req.user.uuid,
                giftDto.receiverId,
                giftDto.quantity || 1,
                giftDto.message
            )

            // Emit WebSocket event for real-time updates
            this.roomGateway.server
                .to(`room_${battleGift.battle.roomId}`)
                .emit('pkBattleGiftSent', {
                    battleId: battleGift.battleId,
                    gift: {
                        id: battleGift.uuid,
                        giftName: battleGift.gift.name,
                        giftImageUrl: battleGift.gift.imageUrl,
                        senderName: battleGift.sender.name,
                        receiverId: battleGift.receiverId,
                        receiverName: battleGift.receiver.name,
                        quantity: battleGift.quantity,
                        value: battleGift.giftValue * battleGift.quantity,
                        message: battleGift.message,
                        sentAt: battleGift.sentAt
                    }
                })

            return {
                statusCode: HttpStatus.CREATED,
                message: 'Gift sent successfully',
                data: {
                    giftId: battleGift.uuid,
                    battleId: battleGift.battleId,
                    senderName: battleGift.sender.name,
                    receiverName: battleGift.receiver.name,
                    giftName: battleGift.gift.name,
                    quantity: battleGift.quantity,
                    totalValue: battleGift.giftValue * battleGift.quantity,
                    message: battleGift.message,
                    sentAt: battleGift.sentAt
                }
            }
        } catch (error) {
            if (error.status) throw error
            throw new BadRequestException(
                error.message || 'Failed to send gift'
            )
        }
    }

    @Get('pk-battles/:battleId')
    @ApiOperation({
        summary: 'Get PK Battle details',
        description:
            'Get detailed information about a PK Battle including current stats'
    })
    @ApiParam({ name: 'battleId', description: 'PK Battle UUID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'PK Battle details retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'PK Battle details retrieved successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        battleId: { type: 'string' },
                        roomId: { type: 'string' },
                        hostName: { type: 'string' },
                        status: { type: 'string' },
                        remainingTime: { type: 'number' },
                        participants: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    userId: { type: 'string' },
                                    name: { type: 'string' },
                                    totalGiftsReceived: { type: 'number' },
                                    giftCount: { type: 'number' }
                                }
                            }
                        },
                        recentGifts: { type: 'array' },
                        winner: { type: 'object', nullable: true }
                    }
                }
            }
        }
    })
    async getPKBattleDetails(@Param('battleId') battleId: string) {
        try {
            const battle = await this.roomService.getPKBattleDetails(battleId)

            return {
                statusCode: HttpStatus.OK,
                message: 'PK Battle details retrieved successfully',
                data: battle
            }
        } catch (error) {
            if (error.status) throw error
            throw new BadRequestException(
                error.message || 'Failed to get battle details'
            )
        }
    }

    @Post('pk-battles/:battleId/cancel')
    @ApiOperation({
        summary: 'Cancel a PK Battle',
        description: 'Host cancels a PK Battle'
    })
    @ApiParam({ name: 'battleId', description: 'PK Battle UUID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'PK Battle cancelled successfully'
    })
    async cancelPKBattle(
        @Param('battleId') battleId: string,
        @Body() cancelDto: CancelPKBattleDto,
        @Request() req: any
    ) {
        try {
            const battle = await this.roomService.cancelPKBattle(
                battleId,
                req.user.uuid,
                cancelDto.reason
            )

            return {
                statusCode: HttpStatus.OK,
                message: 'PK Battle cancelled successfully',
                data: {
                    battleId: battle.uuid,
                    status: battle.status
                }
            }
        } catch (error) {
            if (error.status) throw error
            throw new BadRequestException(
                error.message || 'Failed to cancel battle'
            )
        }
    }

    @Get(':roomId/daily-tasks')
    @ApiOperation({
        summary: 'Get room daily tasks',
        description: 'Fetch daily tasks for a specific room with user progress'
    })
    @ApiParam({ name: 'roomId', description: 'Room UUID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Room daily tasks retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                example: 'send_gifts_in_room'
                            },
                            icon: { type: 'string', example: '🎁' },
                            title: {
                                type: 'string',
                                example: 'Send Gifts in Room'
                            },
                            description: {
                                type: 'string',
                                example: 'Send 10 gifts in this room today'
                            },
                            progress: { type: 'number', example: 3 },
                            total: { type: 'number', example: 10 },
                            reward: { type: 'number', example: 200 },
                            color: { type: 'string', example: '#FF6B6B' },
                            isCompleted: { type: 'boolean', example: false },
                            rewardClaimed: { type: 'boolean', example: false }
                        }
                    }
                }
            }
        }
    })
    async getRoomDailyTasks(@Param('roomId') roomId: string, @Request() req) {
        const userId = req.user.uuid
        const tasks = await this.taskService.getRoomDailyTasks(roomId, userId)

        return {
            success: true,
            data: tasks
        }
    }

    @Get(':roomId/pk-battles/active')
    @ApiOperation({
        summary: 'Get active PK Battle in room',
        description: 'Get the currently active PK Battle in a specific room'
    })
    @ApiParam({ name: 'roomId', description: 'Room UUID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Active PK Battle retrieved successfully'
    })
    async getActivePKBattle(@Param('roomId') roomId: string) {
        try {
            const battle = await this.roomService.getActivePKBattle(roomId)

            return {
                statusCode: HttpStatus.OK,
                message: battle
                    ? 'Active PK Battle found'
                    : 'No active PK Battle',
                data: battle
            }
        } catch (error) {
            if (error.status) throw error
            throw new BadRequestException(
                error.message || 'Failed to get active battle'
            )
        }
    }

    @Get(':roomId/pk-battles/history')
    @ApiOperation({
        summary: 'Get PK Battle history for room',
        description: 'Get historical PK Battles for a specific room'
    })
    @ApiParam({ name: 'roomId', description: 'Room UUID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'PK Battle history retrieved successfully'
    })
    async getRoomPKBattleHistory(
        @Param('roomId') roomId: string,
        @Query('limit') limit: number = 10,
        @Query('offset') offset: number = 0
    ) {
        try {
            const battles = await this.roomService.getRoomPKBattleHistory(
                roomId,
                limit,
                offset
            )

            return {
                statusCode: HttpStatus.OK,
                message: 'PK Battle history retrieved successfully',
                data: {
                    battles,
                    pagination: {
                        limit,
                        offset,
                        count: battles.length
                    }
                }
            }
        } catch (error) {
            if (error.status) throw error
            throw new BadRequestException(
                error.message || 'Failed to get battle history'
            )
        }
    }

    // ==================== USER PROFILE API ====================

    @Get('user-profile/:userId')
    @ApiOperation({
        summary: 'Get user profile',
        description:
            'Get detailed user profile when tapped - shows role, privileges, intimacy connections, etc.'
    })
    @ApiParam({
        name: 'userId',
        description: 'User UUID to get profile for',
        example: '456e7890-e89b-12d3-a456-426614174001'
    })
    @ApiResponse({
        status: 200,
        description: 'User profile in room context retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: {
                    type: 'string',
                    example: 'User profile retrieved successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        userId: {
                            type: 'string',
                            example: '456e7890-e89b-12d3-a456-426614174001'
                        },
                        name: { type: 'string', example: 'Alice Johnson' },
                        displayName: { type: 'string', example: 'AliceGamer' },
                        role: {
                            type: 'string',
                            example: 'host',
                            enum: [
                                'owner',
                                'host',
                                'admin',
                                'speaker',
                                'listener'
                            ]
                        },
                        location: { type: 'string', example: 'New York, USA' },
                        followersCount: { type: 'number', example: 1250 },
                        profile: {
                            type: 'object',
                            properties: {
                                avatarUrl: {
                                    type: 'string',
                                    example:
                                        'https://cloudinary.com/avatar123.jpg'
                                },
                                coverPhoto: {
                                    type: 'string',
                                    example:
                                        'https://cloudinary.com/cover456.jpg'
                                },
                                bio: {
                                    type: 'string',
                                    example:
                                        'Gaming enthusiast and community leader'
                                },
                                level: { type: 'number', example: 25 },
                                badge: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    example: [
                                        'VIP',
                                        'Top Gifter',
                                        'Host Master'
                                    ]
                                }
                            }
                        },
                        privileges: {
                            type: 'object',
                            properties: {
                                giftWall: {
                                    type: 'object',
                                    properties: {
                                        count: { type: 'number', example: 847 },
                                        totalValue: {
                                            type: 'number',
                                            example: 15420.5
                                        },
                                        recentGifts: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    giftId: { type: 'string' },
                                                    name: { type: 'string' },
                                                    imageUrl: {
                                                        type: 'string'
                                                    },
                                                    value: { type: 'number' },
                                                    senderName: {
                                                        type: 'string'
                                                    },
                                                    receivedAt: {
                                                        type: 'string'
                                                    }
                                                }
                                            }
                                        }
                                    }
                                },
                                decoration: {
                                    type: 'object',
                                    properties: {
                                        count: { type: 'number', example: 23 },
                                        activeDecorations: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    decorationId: {
                                                        type: 'string'
                                                    },
                                                    name: { type: 'string' },
                                                    imageUrl: {
                                                        type: 'string'
                                                    },
                                                    type: {
                                                        type: 'string',
                                                        enum: [
                                                            'frame',
                                                            'effect',
                                                            'badge'
                                                        ]
                                                    },
                                                    isActive: {
                                                        type: 'boolean'
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        intimacy: {
                            type: 'object',
                            properties: {
                                totalConnections: {
                                    type: 'number',
                                    example: 156
                                },
                                topConnections: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            userId: { type: 'string' },
                                            name: { type: 'string' },
                                            avatarUrl: { type: 'string' },
                                            intimacyLevel: {
                                                type: 'number',
                                                example: 85
                                            },
                                            connectionType: {
                                                type: 'string',
                                                enum: [
                                                    'gift_exchange',
                                                    'frequent_interaction',
                                                    'mutual_friend'
                                                ]
                                            },
                                            giftExchangeCount: {
                                                type: 'number'
                                            },
                                            lastInteraction: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    async getUserProfile(@Param('userId') userId: string, @Request() req: any) {
        try {
            const currentUserId = req.user?.uuid || req.user?.id

            const profileData = await this.roomService.getUserProfile(
                userId,
                currentUserId
            )

            return {
                success: true,
                message: 'User profile retrieved successfully',
                data: profileData
            }
        } catch (error) {
            if (error.status) throw error
            throw new BadRequestException(
                error.message || 'Failed to get user profile'
            )
        }
    }
}
