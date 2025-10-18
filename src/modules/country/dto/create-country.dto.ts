import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator'

export class CreateCountryDto {
    @ApiProperty({
        description: 'Country name',
        example: 'United States'
    })
    @IsNotEmpty()
    @IsString()
    name: string

    @ApiProperty({
        description: 'ISO 3166-1 alpha-3 country code',
        example: 'USA',
        minLength: 3,
        maxLength: 3
    })
    @IsNotEmpty()
    @IsString()
    @Length(3, 3)
    code: string

    @ApiProperty({
        description: 'URL to country flag image',
        example: 'https://flagcdn.com/w320/us.png',
        required: false
    })
    @IsOptional()
    @IsString()
    flagUrl?: string

    @ApiProperty({
        description: 'Country flag emoji',
        example: '🇺🇸',
        required: false
    })
    @IsOptional()
    @IsString()
    emoji?: string

    @ApiProperty({
        description: 'International phone dialing code',
        example: '+1',
        required: false
    })
    @IsOptional()
    @IsString()
    phoneCode?: string

    @ApiProperty({
        description: 'Display order for sorting',
        example: 1,
        required: false
    })
    @IsOptional()
    displayOrder?: number
}
