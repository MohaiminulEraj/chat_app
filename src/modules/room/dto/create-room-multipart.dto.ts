import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class CreateRoomMultipartDto {
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
        description: 'Maximum number of seats in the room (as string)',
        example: '8',
        required: false,
        default: '8'
    })
    @IsString()
    @IsOptional()
    maxSeats?: string

    @ApiProperty({
        description: 'Whether the room is private (as string)',
        example: 'false',
        required: false,
        default: 'false'
    })
    @IsString()
    @IsOptional()
    isPrivate?: string

    @ApiProperty({
        description: 'Password for private rooms',
        example: 'mySecretPassword',
        required: false
    })
    @IsString()
    @IsOptional()
    password?: string

    @ApiProperty({
        description: 'The type of the room',
        example: 'voice',
        required: false,
        default: 'voice'
    })
    @IsString()
    @IsOptional()
    type?: string

    @ApiProperty({
        description: 'Room avatar image file',
        type: 'string',
        format: 'binary',
        required: false
    })
    @IsOptional()
    avatar?: any
}
