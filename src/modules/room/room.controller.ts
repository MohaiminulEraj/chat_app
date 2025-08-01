import {
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Param,
    Post,
    Put,
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
import { AssignRoomRoleDto, TransferOwnershipDto } from './dto/room-role.dto'
import { CreateRoomDto } from './dto/create-room.dto'
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
        type: Room
    })
    create(@Body() createRoomDto: CreateRoomDto, @Request() req: any) {
        return this.roomService.createRoom(
            createRoomDto.groupId,
            createRoomDto,
            req.user
        )
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
    getRoomByGroupId(@Param('groupId') groupId: string) {
        return this.roomService.getRoomByGroupId(groupId)
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
        type: [RoomParticipant]
    })
    getParticipants(@Param('id') roomId: string) {
        return this.roomService.getRoomParticipants(roomId)
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
        type: [RoomWaitingList]
    })
    getWaitingList(@Param('id') roomId: string) {
        return this.roomService.getRoomWaitingList(roomId)
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
}
