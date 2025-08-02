import { ApiProperty } from '@nestjs/swagger'
import {
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength
} from 'class-validator'

export class CreateRoomCommentDto {
    @ApiProperty({
        description: 'The comment message text',
        example: 'This is a great room!',
        minLength: 1,
        maxLength: 500
    })
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    message: string

    @ApiProperty({
        description: 'Type of message',
        example: 'text',
        enum: ['text', 'emoji', 'sticker', 'system'],
        required: false
    })
    @IsOptional()
    @IsString()
    messageType?: 'text' | 'emoji' | 'sticker' | 'system'

    @ApiProperty({
        description: 'UUID of the comment being replied to',
        example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
        required: false
    })
    @IsOptional()
    @IsUUID()
    replyToId?: string

    @ApiProperty({
        description: 'Additional metadata for the message',
        example: { emoji: '😀', stickerpack: 'animals' },
        required: false
    })
    @IsOptional()
    metadata?: any
}

export class SendRoomCommentDto extends CreateRoomCommentDto {
    @ApiProperty({
        description: 'Room UUID where the comment will be sent',
        example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
    })
    @IsUUID()
    roomId: string
}
