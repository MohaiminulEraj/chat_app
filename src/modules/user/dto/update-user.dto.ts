import { ApiProperty, PartialType } from '@nestjs/swagger'
import {
    IsOptional,
    IsString,
    IsUrl,
    ValidateIf,
    IsNumber,
    IsArray,
    Min
} from 'class-validator'
import { CreateUserDto } from './create-user.dto'

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({
        description: 'Avatar URL (automatically set when file is uploaded)',
        required: false
    })
    @IsOptional()
    @ValidateIf((o) => o.avatarUrl && o.avatarUrl.length > 0)
    @IsUrl({}, { message: 'Avatar URL must be a valid URL' })
    avatarUrl?: string

    @ApiProperty({
        description: 'Cover image URL',
        required: false
    })
    @IsOptional()
    @ValidateIf((o) => o.coverImage && o.coverImage.length > 0)
    @IsUrl({}, { message: 'Cover image URL must be a valid URL' })
    coverImage?: string

    @ApiProperty({
        description: 'Country ID (UUID)',
        required: false,
        example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    })
    @IsOptional()
    @IsString()
    countryId?: string

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
    @ValidateIf((o) => o.frameImage && o.frameImage.length > 0)
    @IsUrl({}, { message: 'Frame image URL must be a valid URL' })
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
}
