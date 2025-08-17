import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator'
import { MessageType } from '../entities/message.entity'

export class CreateMessageDto {
    @IsUUID()
    conversationId: string

    @IsEnum(MessageType)
    type: MessageType

    @IsString()
    content: string

    @IsObject()
    @IsOptional()
    metadata?: {
        fileName?: string
        fileSize?: number
        mimeType?: string
        duration?: number
        thumbnailUrl?: string
        giftId?: string
    }

    @IsUUID()
    @IsOptional()
    replyToId?: string
}
