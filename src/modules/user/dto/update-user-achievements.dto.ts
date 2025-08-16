import { ApiProperty } from '@nestjs/swagger'
import {
    IsOptional,
    IsArray,
    IsNumber,
    IsString,
    ValidateNested,
    Min
} from 'class-validator'
import { Type } from 'class-transformer'

export class AchievementItemDto {
    @ApiProperty({
        description: 'Achievement item ID',
        example: 'gift-001'
    })
    @IsString()
    _id: string

    @ApiProperty({
        description: 'Achievement item name',
        example: 'Golden Rose'
    })
    @IsString()
    name: string

    @ApiProperty({
        description: 'Achievement image URL',
        example: 'https://example.com/golden-rose.png'
    })
    @IsString()
    achievementImage: string

    @ApiProperty({
        description: 'Achievement description',
        example: 'A beautiful golden rose gift'
    })
    @IsString()
    achievementDescription: string

    @ApiProperty({
        description: 'Achievement count',
        example: 5,
        minimum: 0
    })
    @IsNumber()
    @Min(0)
    count: number
}

export class UpdateUserAchievementsDto {
    @ApiProperty({
        description: 'Array of purchased gifts',
        type: [AchievementItemDto],
        required: false
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AchievementItemDto)
    purchasedGifts?: AchievementItemDto[]

    @ApiProperty({
        description: 'Array of entry effects',
        type: [AchievementItemDto],
        required: false
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AchievementItemDto)
    entryEffects?: AchievementItemDto[]

    @ApiProperty({
        description: 'Array of frames',
        type: [AchievementItemDto],
        required: false
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AchievementItemDto)
    frames?: AchievementItemDto[]

    @ApiProperty({
        description: 'User level',
        required: false,
        minimum: 0
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    level?: number

    @ApiProperty({
        description: 'User balance',
        required: false,
        minimum: 0
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    balance?: number

    @ApiProperty({
        description: 'Frame ID',
        required: false
    })
    @IsOptional()
    @IsString()
    frameId?: string

    @ApiProperty({
        description: 'Frame image URL',
        required: false
    })
    @IsOptional()
    @IsString()
    frameImage?: string

    @ApiProperty({
        description: 'User badges',
        required: false,
        type: [String]
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    badge?: string[]

    @ApiProperty({
        description: 'User display name',
        required: false
    })
    @IsOptional()
    @IsString()
    displayName?: string

    @ApiProperty({
        description: 'User bio',
        required: false
    })
    @IsOptional()
    @IsString()
    bio?: string

    @ApiProperty({
        description: 'User country',
        required: false
    })
    @IsOptional()
    @IsString()
    country?: string
}
