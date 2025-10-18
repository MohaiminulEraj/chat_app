import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'
import { CreateCountryDto } from './create-country.dto'

export class UpdateCountryDto extends PartialType(CreateCountryDto) {
    @ApiProperty({
        description: 'Whether the country is active',
        example: true,
        required: false
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean
}
