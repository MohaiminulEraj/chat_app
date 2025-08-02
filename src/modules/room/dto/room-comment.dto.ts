import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
    IsEnum,
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

    @ApiPropertyOptional({
        description: 'Type of message',
        example: 'text',
        enum: ['text', 'emoji', 'sticker', 'system'],
        default: 'text'
    })
    @IsOptional()
    @IsEnum(['text', 'emoji', 'sticker', 'system'])
    messageType?: 'text' | 'emoji' | 'sticker' | 'system'

    @ApiPropertyOptional({
        description: 'UUID of the comment being replied to',
        example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
    })
    @IsOptional()
    @IsUUID()
    replyToId?: string

    @ApiPropertyOptional({
        description: 'Additional metadata for the message',
        example: { emoji: '😀', stickerpack: 'animals' }
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

export class ReactToCommentDto {
    @ApiProperty({
        description: 'Room UUID',
        example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
    })
    @IsUUID()
    roomId: string

    @ApiProperty({
        description: 'Comment UUID to react to',
        example: 'b81bef5b-332e-5e6a-b70b-116f3663g7g9'
    })
    @IsUUID()
    commentId: string

    @ApiProperty({
        description: 'Reaction emoji or type',
        example: '👍',
        maxLength: 10
    })
    @IsString()
    @MaxLength(10)
    reaction: string

    @ApiProperty({
        description: 'Action to perform with the reaction',
        example: 'add',
        enum: ['add', 'remove']
    })
    @IsEnum(['add', 'remove'])
    action: 'add' | 'remove'
}

export class TypingCommentDto {
    @ApiProperty({
        description: 'Room UUID',
        example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
    })
    @IsUUID()
    roomId: string

    @ApiProperty({
        description: 'Whether user is currently typing',
        example: true
    })
    isTyping: boolean
}
