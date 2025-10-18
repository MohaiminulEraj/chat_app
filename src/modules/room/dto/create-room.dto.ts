import { ApiProperty } from '@nestjs/swagger'
import {
    IsBoolean,
    IsEnum,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    ValidateIf
} from 'class-validator'
import { RoomType } from '../entities/room.entity'

export class CreateRoomDto {
    @ApiProperty({
        description: 'The UUID of the group this room belongs to',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsString()
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
        description: 'Maximum number of seats in the room',
        example: 8,
        enum: [6, 8, 10],
        required: false,
        default: 8
    })
    @IsNumber()
    @IsIn([6, 8, 10], { message: 'maxSeats must be either 6, 8, or 10' })
    @IsOptional()
    maxSeats?: number

    @ApiProperty({
        description: 'Whether the room is private (requires password)',
        example: false,
        required: false,
        default: false
    })
    @IsBoolean()
    @IsOptional()
    isPrivate?: boolean

    @ApiProperty({
        description:
            'Password for private rooms (required if isPrivate is true)',
        example: 'mySecretPassword',
        required: false
    })
    @ValidateIf((obj) => obj.isPrivate === true)
    @IsNotEmpty({ message: 'Password is required for private rooms' })
    @IsString()
    password?: string

    @ApiProperty({
        description: 'The type of the room',
        example: 'voice',
        enum: RoomType,
        required: false,
        default: 'voice'
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

    @ApiProperty({
        description: 'URL of the room avatar image',
        example:
            'https://res.cloudinary.com/kitty/image/upload/v1234567890/rooms/room-avatar.jpg',
        required: false
    })
    @IsString()
    @IsOptional()
    roomAvatarUrl?: string

    @ApiProperty({
        description: 'Room avatar image file',
        type: 'string',
        format: 'binary',
        required: false
    })
    @IsOptional()
    avatar?: any

    @ApiProperty({
        description: 'Country ID (UUID) where the room is located',
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        required: false
    })
    @IsString()
    @IsOptional()
    countryId?: string
}
