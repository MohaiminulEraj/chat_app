import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Twilio, { Twilio as TwilioClient } from 'twilio'

@Injectable()
export class OtpService {
    private twilioClient: TwilioClient
    private fromPhone: string
    private isDevelopment: boolean

    constructor(private configService: ConfigService) {
        this.isDevelopment = this.configService.get('APP_ENV') === 'development'

        if (!this.isDevelopment) {
            this.twilioClient = Twilio(
                this.configService.get<string>('TWILIO_ACCOUNT_SID'),
                this.configService.get<string>('TWILIO_AUTH_TOKEN')
            )
            this.fromPhone = this.configService.get<string>(
                'TWILIO_PHONE_NUMBER'
            )
        }
    }

    generateOTP(): string {
        const length = this.configService.get<number>('OTP_LENGTH', 6)
        return Math.floor(
            Math.pow(10, length - 1) +
                Math.random() * 9 * Math.pow(10, length - 1)
        ).toString()
    }

    async sendOTP(
        phoneNumber: string
    ): Promise<{ success: boolean; message?: string }> {
        const otp = this.generateOTP()

        try {
            if (this.isDevelopment) {
                // In development, just log the OTP
                console.log(`📱 OTP for ${phoneNumber}: ${otp}`)
                return { success: true, message: `OTP sent to ${phoneNumber}` }
            }

            // Send real SMS in production
            await this.twilioClient.messages.create({
                body: `Your verification code is: ${otp}. Valid for 5 minutes.`,
                from: this.fromPhone,
                to: phoneNumber
            })

            // Store OTP in cache/database with expiry
            // TODO: Implement OTP storage with Redis or database

            return { success: true, message: 'OTP sent successfully' }
        } catch (error) {
            throw new BadRequestException(
                `Failed to send OTP: ${error.message}`
            )
        }
    }

    async verifyOTP(phoneNumber: string, otp: string): Promise<boolean> {
        // TODO: Retrieve stored OTP and verify
        // For now, just return true for development
        return this.isDevelopment ? true : false
    }
}
