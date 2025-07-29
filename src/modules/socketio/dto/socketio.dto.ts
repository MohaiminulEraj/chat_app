import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'

export class AuthenticateDto {
    @IsString()
    token: string
}

export class SendDirectMessageDto {
    @IsUUID()
    recipientId: string

    @IsEnum(['text', 'image', 'file', 'voice'])
    type: 'text' | 'image' | 'file' | 'voice'

    @IsString()
    @IsOptional()
    content?: string

    @IsString()
    @IsOptional()
    fileUrl?: string

    @IsOptional()
    metadata?: any
}

export class SendGroupMessageDto {
    @IsUUID()
    groupId: string

    @IsEnum(['text', 'image', 'file', 'voice'])
    type: 'text' | 'image' | 'file' | 'voice'

    @IsString()
    @IsOptional()
    content?: string

    @IsString()
    @IsOptional()
    fileUrl?: string

    @IsOptional()
    metadata?: any

    @IsUUID()
    @IsOptional()
    replyToMessageId?: string
}

export class JoinConversationDto {
    @IsUUID()
    conversationId: string
}

export class JoinGroupDto {
    @IsUUID()
    groupId: string
}

export class TypingDto {
    @IsUUID()
    @IsOptional()
    conversationId?: string

    @IsUUID()
    @IsOptional()
    groupId?: string

    @IsString()
    isTyping: boolean
}

export class MarkAsReadDto {
    @IsUUID()
    @IsOptional()
    conversationId?: string

    @IsUUID()
    @IsOptional()
    groupId?: string

    @IsUUID(4, { each: true })
    messageIds: string[]
}

export class UpdateStatusDto {
    @IsEnum(['online', 'away', 'busy', 'offline'])
    status: 'online' | 'away' | 'busy' | 'offline'
}

export class InitiateCallDto {
    @IsUUID()
    @IsOptional()
    recipientId?: string

    @IsUUID()
    @IsOptional()
    groupId?: string

    @IsEnum(['voice', 'video'])
    callType: 'voice' | 'video'

    @IsUUID()
    callId: string
}

export class RespondToCallDto {
    @IsUUID()
    callId: string

    @IsEnum(['accept', 'decline'])
    response: 'accept' | 'decline'

    @IsUUID()
    callerId: string
}

export class EndCallDto {
    @IsUUID()
    callId: string

    @IsUUID(4, { each: true })
    participants: string[]
}
