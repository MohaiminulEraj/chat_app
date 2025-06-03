import {
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Param,
    Post,
    Put,
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
import { CreateRoomDto } from './dto/create-room.dto'
import { UpdateRoomDto } from './dto/update-room.dto'
import { RoomParticipant } from './entities/room-participant.entity'
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
    create(@Body() createRoomDto: CreateRoomDto) {
        return this.roomService.createRoom(createRoomDto.groupId, createRoomDto)
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
}
