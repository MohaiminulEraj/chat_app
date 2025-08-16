import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class JoinRoomDto {
    @ApiProperty({
        description: 'Password for private rooms',
        example: 'mySecretPassword',
        required: false
    })
    @IsOptional()
    @IsString()
    password?: string
}
