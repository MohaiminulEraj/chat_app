import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
    IsArray,
    IsBoolean,
    IsOptional,
    IsString,
    IsUUID
} from 'class-validator'

export class CreateGroupDto {
    @ApiProperty({
        description: 'Name of the group',
        example: 'Study Group',
        required: true
    })
    @IsString()
    name: string

    @ApiProperty({
        description: 'Description of the group',
        example: 'A group for discussing study materials',
        required: false
    })
    @IsString()
    @IsOptional()
    description?: string

    @ApiProperty({
        description: 'Avatar URL for the group',
        example: 'https://example.com/avatar.jpg',
        required: false
    })
    @IsString()
    @IsOptional()
    avatarUrl?: string

    @ApiProperty({
        description: 'Whether the group is public or private',
        example: false,
        default: false,
        required: false
    })
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value === 'true'
        }
        return value
    })
    @IsBoolean()
    @IsOptional()
    isPublic?: boolean = false

    @ApiProperty({
        description: 'Array of member UUIDs to add to the group',
        example: [
            '123e4567-e89b-12d3-a456-426614174000',
            '987fcdeb-51a2-43f1-9876-543210fedcba'
        ],
        type: [String],
        required: false
    })
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            return value
                .split(',')
                .map((id) => id.trim())
                .filter((id) => id)
        }
        return value
    })
    @IsArray()
    @IsUUID('4', { each: true })
    @IsOptional()
    memberIds?: string[]

    @ApiProperty({
        description: 'Avatar file for the group (handled by file upload)',
        type: 'string',
        format: 'binary',
        required: false
    })
    @IsOptional()
    avatar?: any

    @ApiProperty({
        description: 'Country or city name',
        example: 'Germany',
        required: false
    })
    @IsString()
    @IsOptional()
    location?: string

    @ApiProperty({ description: 'Latitude', example: 51.1657, required: false })
    @IsOptional()
    latitude?: number

    @ApiProperty({
        description: 'Longitude',
        example: 10.4515,
        required: false
    })
    @IsOptional()
    longitude?: number

    @ApiProperty({
        description: 'Flag image file (binary)',
        type: 'string',
        format: 'binary',
        required: false
    })
    @IsOptional()
    flag?: any
}
