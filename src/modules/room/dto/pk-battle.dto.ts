import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
    IsArray,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
    ArrayMaxSize,
    ArrayMinSize
} from 'class-validator'
import { PKBattleType } from '../entities/pk-battle.entity'

export class CreatePKBattleDto {
    @ApiProperty({
        description: 'Room UUID where the PK Battle will take place',
        example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
    })
    @IsUUID()
    roomId: string

    @ApiProperty({
        description: 'Type of PK Battle',
        enum: PKBattleType,
        example: PKBattleType.HOST_SELECTED
    })
    @IsEnum(PKBattleType)
    battleType: PKBattleType

    @ApiProperty({
        description:
            'Battle duration in minutes (1-180 minutes = 1min to 3 hours)',
        example: 5,
        minimum: 1,
        maximum: 180
    })
    @IsNumber()
    @Min(1)
    @Max(180)
    durationMinutes: number

    @ApiProperty({
        description: 'Array of participant user IDs (exactly 2 participants)',
        example: ['user1-uuid', 'user2-uuid'],
        type: [String]
    })
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsUUID('4', { each: true })
    participantIds: string[]

    @ApiPropertyOptional({
        description: 'Optional battle description or rules',
        example: 'Epic singing battle between top performers'
    })
    @IsOptional()
    @IsString()
    description?: string

    @ApiPropertyOptional({
        description: 'Additional battle metadata',
        example: { theme: 'singing', category: 'entertainment' }
    })
    @IsOptional()
    metadata?: any
}

export class ApprovePKBattleDto {
    @ApiProperty({
        description: 'PK Battle UUID to approve',
        example: 'b82bef5b-443e-5e7a-c80c-227f4773h8h0'
    })
    @IsUUID()
    battleId: string

    @ApiProperty({
        description: 'Whether to approve (true) or reject (false) the battle',
        example: true
    })
    approved: boolean

    @ApiPropertyOptional({
        description: 'Reason for rejection (required if approved is false)',
        example: 'Participants are not ready'
    })
    @IsOptional()
    @IsString()
    reason?: string
}

export class StartPKBattleDto {
    @ApiProperty({
        description: 'PK Battle UUID to start',
        example: 'b82bef5b-443e-5e7a-c80c-227f4773h8h0'
    })
    @IsUUID()
    battleId: string
}

export class SendPKBattleGiftDto {
    @ApiProperty({
        description: 'PK Battle UUID',
        example: 'b82bef5b-443e-5e7a-c80c-227f4773h8h0'
    })
    @IsUUID()
    battleId: string

    @ApiProperty({
        description: 'Gift UUID to send',
        example: 'c93cef6c-554f-6f8b-d91d-338g5884i9i1'
    })
    @IsUUID()
    giftId: string

    @ApiProperty({
        description: 'Participant user ID who will receive the gift',
        example: 'user1-uuid'
    })
    @IsUUID()
    receiverId: string

    @ApiPropertyOptional({
        description: 'Number of gifts to send',
        example: 1,
        default: 1,
        minimum: 1,
        maximum: 100
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    quantity?: number

    @ApiPropertyOptional({
        description: 'Optional message with the gift',
        example: 'You can do it! 🔥'
    })
    @IsOptional()
    @IsString()
    message?: string
}

export class PKBattleParticipantResponseDto {
    @ApiProperty({
        description: 'PK Battle UUID',
        example: 'b82bef5b-443e-5e7a-c80c-227f4773h8h0'
    })
    @IsUUID()
    battleId: string

    @ApiProperty({
        description:
            'Whether the participant accepts (true) or declines (false)',
        example: true
    })
    accepted: boolean
}

export class GetPKBattleStatsDto {
    @ApiProperty({
        description: 'PK Battle UUID',
        example: 'b82bef5b-443e-5e7a-c80c-227f4773h8h0'
    })
    @IsUUID()
    battleId: string
}

export class CancelPKBattleDto {
    @ApiProperty({
        description: 'PK Battle UUID to cancel',
        example: 'b82bef5b-443e-5e7a-c80c-227f4773h8h0'
    })
    @IsUUID()
    battleId: string

    @ApiPropertyOptional({
        description: 'Reason for cancelling the battle',
        example: 'Technical issues'
    })
    @IsOptional()
    @IsString()
    reason?: string
}
