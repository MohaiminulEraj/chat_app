import { ApiProperty } from '@nestjs/swagger'
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    Length,
    MinLength
} from 'class-validator'

import { IsOptional } from 'class-validator'
import { ValidationMessage } from 'src/common/filters/validation.messages'

export class LoginDto {
    @IsString({
        message: ValidationMessage('emailOrPhone').isString
    })
    @IsNotEmpty({
        message: ValidationMessage('emailOrPhone').isNotEmpty
    })
    @ApiProperty({
        description: 'Email address or phone number',
        example: 'eraj@gmail.com'
    })
    emailOrPhone: string

    @IsString({
        message: ValidationMessage('password').isString
    })
    @IsNotEmpty({
        message: ValidationMessage('password').isNotEmpty
    })
    @ApiProperty({
        description: 'User password',
        example: '12345678'
    })
    password: string
}

export class RegistrationDto {
    @IsString({
        message: ValidationMessage('name').isString
    })
    @IsNotEmpty({
        message: ValidationMessage('name').isNotEmpty
    })
    @ApiProperty({
        description: 'User name',
        example: 'Eraj'
    })
    name: string

    @IsString({
        message: ValidationMessage('email').isString
    })
    @IsNotEmpty({
        message: ValidationMessage('email').isNotEmpty
    })
    @IsEmail()
    @ApiProperty({
        description: 'User email address',
        example: 'eraj@gmail.com'
    })
    email: string

    @IsString({
        message: ValidationMessage('phoneNumber').isString
    })
    @IsNotEmpty({
        message: ValidationMessage('phoneNumber').isNotEmpty
    })
    @ApiProperty({
        description: 'User phone number',
        example: '01891234567'
    })
    phoneNumber: string

    @IsString({
        message: ValidationMessage('password').isString
    })
    @IsNotEmpty({
        message: ValidationMessage('password').isNotEmpty
    })
    @MinLength(6)
    @ApiProperty({
        description: 'User password',
        example: '12345678'
    })
    password: string

    @IsString({
        message: ValidationMessage('confirmPassword').isString
    })
    @IsNotEmpty({
        message: ValidationMessage('confirmPassword').isNotEmpty
    })
    @MinLength(6)
    @ApiProperty({
        description: 'Confirm password',
        example: '12345678'
    })
    confirmPassword: string
}

export class EmailVerificationDto {
    @IsString({
        message: ValidationMessage('email').isString
    })
    @IsNotEmpty({
        message: ValidationMessage('email').isNotEmpty
    })
    @IsEmail()
    @ApiProperty()
    email: string

    @IsString({
        message: ValidationMessage('code').isString
    })
    @IsNotEmpty({
        message: ValidationMessage('code').isNotEmpty
    })
    @ApiProperty()
    code: string
}

export class UpdatePasswordDto {
    @IsOptional()
    @IsString()
    @ApiProperty()
    hash: string

    @IsOptional()
    @IsString()
    @ApiProperty()
    userUuid: string

    @IsString()
    @MinLength(6)
    @ApiProperty()
    newPassword: string

    @IsString()
    @MinLength(6)
    @ApiProperty()
    confirmPassword: string
}

export class ForgetPasswordDto {
    @IsString()
    @Length(6)
    @ApiProperty()
    code: string

    @IsString()
    @IsEmail()
    @ApiProperty()
    email: string
}

export class VerificationCodeSenderDto {
    @IsString()
    @IsEmail()
    @ApiProperty()
    email: string
}
