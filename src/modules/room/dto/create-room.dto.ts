import { ApiProperty } from '@nestjs/swagger'
import {
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min
} from 'class-validator'
import { RoomType } from '../entities/room.entity'

export class CreateRoomDto {
    @ApiProperty({
        description: 'The UUID of the group this room belongs to',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsUUID()
    groupId: string

    @ApiProperty({
        description: 'Name of the room',
        example: 'Gaming Room #1'
    })
    @IsString()
    name: string

    @ApiProperty({
        description: 'Description of the room',
        example: 'A room for playing games together',
        required: false
    })
    @IsString()
    @IsOptional()
    description?: string

    @ApiProperty({
        description: 'Maximum number of participants allowed',
        example: 5,
        minimum: 1,
        maximum: 50
    })
    @IsNumber()
    @Min(1)
    @Max(50)
    maxParticipants: number

    @ApiProperty({
        description: 'Whether the room is private',
        example: false,
        required: false,
        default: false
    })
    @IsBoolean()
    @IsOptional()
    isPrivate?: boolean

    @ApiProperty({
        description: 'The type of the room',
        example: 'VOICE',
        enum: RoomType
    })
    @IsEnum(RoomType)
    @IsOptional()
    type?: RoomType = RoomType.VOICE

    @ApiProperty({
        description: 'Room settings',
        type: 'object',
        properties: {
            quality: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'Quality of the room audio/video'
            },
            autoMute: {
                type: 'boolean',
                description: 'Whether to auto-mute participants on entry'
            },
            waitingRoom: {
                type: 'boolean',
                description: 'Whether to enable waiting room feature'
            }
        },
        required: false
    })
    @IsOptional()
    settings?: {
        quality?: 'low' | 'medium' | 'high'
        autoMute?: boolean
        waitingRoom?: boolean
    }
}
