import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export enum AgoraRole {
    PUBLISHER = 'publisher',
    SUBSCRIBER = 'subscriber'
}

export class GenerateAgoraTokenDto {
    @ApiProperty({
        description: 'The name of the Agora channel to join (room UUID)',
        example: 'room_123e4567-e89b-12d3-a456-426614174000'
    })
    @IsNotEmpty()
    @IsString()
    channelName: string

    @ApiPropertyOptional({
        description: 'Role of the user in the channel (default: publisher)',
        enum: AgoraRole,
        example: AgoraRole.PUBLISHER,
        default: AgoraRole.PUBLISHER
    })
    @IsOptional()
    @IsEnum(AgoraRole)
    role?: AgoraRole = AgoraRole.PUBLISHER
}
