import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateUserDto {
    @ApiProperty({
        example: 'john@example.com',
        description: 'User email address'
    })
    @IsEmail()
    email: string

    @ApiProperty({ example: 'password123', description: 'User password' })
    @IsString()
    @MinLength(6)
    password: string

    @ApiProperty({
        example: 'John Doe',
        description: 'Display name',
        required: false
    })
    @IsString()
    @IsOptional()
    displayName?: string

    @ApiProperty({
        example: 'John',
        description: 'First/Real name',
        required: false
    })
    @IsString()
    @IsOptional()
    name?: string

    @ApiProperty({
        example: '+1234567890',
        description: 'Phone number',
        required: false
    })
    @IsString()
    @IsOptional()
    phoneNumber?: string

    @ApiProperty({
        example: 'https://example.com/avatar.jpg',
        description: 'Avatar URL',
        required: false
    })
    @IsString()
    @IsOptional()
    avatarUrl?: string

    @ApiProperty({
        example: 'Software developer',
        description: 'User bio',
        required: false
    })
    @IsString()
    @IsOptional()
    bio?: string

    @ApiProperty({
        example: 'https://example.com/cover.jpg',
        description: 'Cover image URL',
        required: false
    })
    @IsString()
    @IsOptional()
    coverImage?: string

    @ApiProperty({
        example: 'United States',
        description: 'User country',
        required: false
    })
    @IsString()
    @IsOptional()
    country?: string
}
