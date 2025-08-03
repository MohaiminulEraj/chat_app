import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator'

export class CreateCommentDto {
    @ApiProperty({
        description: 'Room UUID where the comment will be posted',
        example: 'f560631b-1a55-45f7-ab0d-27b836bf245e'
    })
    @IsUUID()
    room: string

    @ApiProperty({
        description: 'The comment content',
        example: 'hlw',
        minLength: 1,
        maxLength: 500
    })
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    content: string
}
