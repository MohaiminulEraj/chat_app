import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator'
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
}
