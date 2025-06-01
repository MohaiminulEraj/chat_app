import { Body, Controller, HttpStatus, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { OtpService } from './otp.service'

@ApiTags('OTP')
@Controller('otp')
export class OtpController {
    constructor(private readonly otpService: OtpService) {}

    @Post('send')
    @ApiOperation({ summary: 'Send OTP to phone number' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'OTP sent successfully'
    })
    async sendOTP(@Body('phoneNumber') phoneNumber: string) {
        const otp = await this.otpService.sendOTP(phoneNumber)
        return {
            message: 'OTP sent',
            otp: process.env.NODE_ENV !== 'production' ? otp : undefined
        }
    }

    @Post('verify')
    @ApiOperation({ summary: 'Verify OTP code' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'OTP verified successfully'
    })
    async verifyOTP(@Body() body: { phoneNumber: string; otp: string }) {
        const success = await this.otpService.verifyOTP(
            body.phoneNumber,
            body.otp
        )
        return { message: 'OTP verified', success }
    }
}
