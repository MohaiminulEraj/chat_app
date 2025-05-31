import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsOptional, IsUrl } from 'class-validator'
import { CreateUserDto } from './create-user.dto'

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({
        description: 'Avatar URL (automatically set when file is uploaded)',
        required: false
    })
    @IsOptional()
    @IsUrl()
    avatarUrl?: string
}
