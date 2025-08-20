import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsOptional } from 'class-validator'
import { CreateRoomDto } from './create-room.dto'

export class UpdateRoomDto extends PartialType(CreateRoomDto) {}

export class UpdateRoomWithFileDto {
    @ApiProperty({
        description: 'Name of the room',
        example: 'Gaming Room #1',
        required: false
    })
    @IsOptional()
    name?: string

    @ApiProperty({
        description: 'Description of the room',
        example: 'A room for playing games together',
        required: false
    })
    @IsOptional()
    description?: string

    @ApiProperty({
        description: 'Maximum number of seats in the room',
        example: 8,
        enum: [6, 8, 10],
        required: false
    })
    @IsOptional()
    maxSeats?: number

    @ApiProperty({
        description: 'Whether the room is private (requires password)',
        example: false,
        required: false
    })
    @IsOptional()
    isPrivate?: boolean

    @ApiProperty({
        description: 'Password for private rooms',
        example: 'mySecretPassword',
        required: false
    })
    @IsOptional()
    password?: string

    @ApiProperty({
        description: 'Whether the room is locked',
        example: false,
        required: false
    })
    @IsOptional()
    isLocked?: boolean

    @ApiProperty({
        description: 'Whether the room is active',
        example: true,
        required: false
    })
    @IsOptional()
    isActive?: boolean

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Room avatar image file',
        required: false
    })
    @IsOptional()
    file?: Express.Multer.File
}
