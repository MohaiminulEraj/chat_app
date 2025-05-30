import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'fs/promises'
import * as hbs from 'handlebars'
import * as nodemailer from 'nodemailer'
import * as path from 'path'
import { User } from '../../user/entities/user.entity'

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter
    private readonly logger = new Logger(EmailService.name)
    private isEmailEnabled: boolean = false

    constructor(private configService: ConfigService) {
        // Check if email service should be enabled
        const enableEmail =
            this.configService.get<string>('ENABLE_EMAIL_SERVICE') !== 'false'

        if (!enableEmail) {
            this.logger.warn(
                'Email service is disabled. Set ENABLE_EMAIL_SERVICE=true to enable.'
            )
            return
        }

        // Detect email provider from SMTP host
        const smtpHost = this.configService
            .get<string>('SMTP_HOST', '')
            .toLowerCase()
        const isBrevo =
            smtpHost.includes('brevo') || smtpHost.includes('sendinblue')
        const isGmail = smtpHost.includes('gmail')

        this.logger.log(
            `Configuring email service with ${isBrevo ? 'Brevo' : isGmail ? 'Gmail' : 'SMTP'} provider`
        )

        try {
            // Universal SMTP configuration that works with Brevo, Gmail, and others
            this.transporter = nodemailer.createTransport({
                host: this.configService.get('SMTP_HOST'),
                port: this.configService.get<number>('SMTP_PORT', 587),
                secure: false, // Use STARTTLS
                auth: {
                    user: this.configService.get('SMTP_USER'),
                    pass: this.configService.get('SMTP_PASSWORD')
                },
                tls: {
                    rejectUnauthorized: false,
                    ciphers: 'SSLv3'
                }
            })

            // Only verify in non-production environments
            if (this.configService.get('NODE_ENV') !== 'production') {
                // Delay verification to avoid blocking startup
                setTimeout(() => this.verifyConnection(), 5000)
            }

            this.isEmailEnabled = true
        } catch (error) {
            this.logger.error('Failed to initialize email service:', error)
            this.isEmailEnabled = false
        }
    }

    private async verifyConnection() {
        if (!this.isEmailEnabled || !this.transporter) return

        try {
            await this.transporter.verify()
            this.logger.log('✅ SMTP connection verified successfully')
        } catch (err) {
            this.logger.error('❌ SMTP connection failed:', err.message)
            this.logger.warn(`
📧 Email Setup Instructions:

For Brevo/Sendinblue:
1. Log in to your Brevo account
2. Go to SMTP & API section
3. Use the SMTP credentials provided
4. Update your .env file with the credentials

For Gmail:
1. Enable 2-Step Verification
2. Generate an app password
3. Use the app password in .env

Current configuration:
- SMTP_HOST: ${this.configService.get('SMTP_HOST')}
- SMTP_PORT: ${this.configService.get('SMTP_PORT')}
- SMTP_USER: ${this.configService.get('SMTP_USER')}

To disable email temporarily, set ENABLE_EMAIL_SERVICE=false in .env
`)
        }
    }

    // Helper method to check if email is enabled
    private async sendEmailSafely(mailOptions: any) {
        if (!this.isEmailEnabled || !this.transporter) {
            this.logger.warn('Email service is not enabled. Email not sent.')
            return { messageId: 'email-disabled', accepted: [mailOptions.to] }
        }

        try {
            return await this.transporter.sendMail(mailOptions)
        } catch (error) {
            this.logger.error(
                `Failed to send email to ${mailOptions.to}:`,
                error.message
            )
            throw error
        }
    }

    /**
     * SEND USER INVITATION MAIL
     */
    async sendUserInvitationMail(
        userName: string,
        userEmail: string,
        organizationName: string,
        roleName: string,
        uuid: string
    ) {
        const message = `Hello ${userName},

        ${organizationName} has invited to join Kitty as ${roleName}. You can collaborate with your team in real-time to manage organizational bookkeeping. Please click on the following link to get started:
        ${process.env.CLIENT_APP_URL}/auth?invitation=accepted&invitation-code=${uuid}

        If you need any assistance, contact us at info@anchorblock.vc

        Best regards,
        Kitty Organization`

        const msgData = {
            recipient: userName,
            title: `You have been added to ${organizationName} on Anchorbook - Your Accounting Software Solution`,
            message: message,
            redirectTo: `${process.env.APP_URL}`,
            btnTitle: 'Back To Kitty'
        }
        // const template = path.join(__dirname, 'templates', 'email-template.hbs')
        // EMAIL TEMPLATE
        const template = path.join(
            __dirname,
            '..',
            'templates',
            'email-template.hbs'
        )
        const source = await fs.readFile(template, 'utf-8')
        const compiled = hbs.compile(source)

        return this.sendEmailSafely({
            to: userEmail,
            from: this.configService.get('SMTP_MAIL_FROM'),
            subject: `You have been added to ${organizationName} on Anchorbook - Your Accounting Software Solution`,
            html: compiled({ msgData })
        })
    }

    /**
     * SEND A CODE TO RECOVER PASSWORD MAIL
     */
    async sendForgetPasswordCode(userObj: User, code: number) {
        const message = `To update your password, Please verify your account by entering the following verification code: ${code}. Enter the code on the password reset page within the next 2 minutes to complete the process.

        Thank you for choosing Kitty.

        Best regards,

        Kitty Support Team.`

        const msgData = {
            recipient: userObj.name,
            title: `Password Reset Verification Code.`,
            message: message,
            redirectTo: `${process.env.APP_URL}`,
            btnTitle: 'Back To Kitty'
        }

        // EMAIL TEMPLATE
        const template = path.join(
            __dirname,
            '..',
            'templates',
            'email-template.hbs'
        )
        const source = await fs.readFile(template, 'utf-8')
        const compiled = hbs.compile(source)

        return this.sendEmailSafely({
            to: userObj.email,
            from: this.configService.get('SMTP_MAIL_FROM'),
            subject: `Password Reset Verification Code for Your Anchorbook account - Your Accounting Software Solution`,
            html: compiled({ msgData })
        })
    }

    /**
     * SEND A CODE TO RECOVER FOR EMAIL VERIFICATION
     */
    async sendEmailVerificationCode(userObj: User, code: number) {
        const message = `Thank you for signing up! To ensure the security of your account, we request you to verify your email address by entering the verification code provided below:  ${code}. Enter this code within the next 2 minutes to verify your email.

        Best regards,
        One Supercharged Platform.`

        const msgData = {
            recipient: userObj.name,
            title: `Email Verification Code: ${code} - Action Required.`,
            message: message,
            redirectTo: `${process.env.APP_URL}`,
            btnTitle: 'Back'
        }

        // EMAIL TEMPLATE
        const template = path.join(
            __dirname,
            '..',
            'templates',
            'email-template.hbs'
        )
        const source = await fs.readFile(template, 'utf-8')
        const compiled = hbs.compile(source)

        return this.sendEmailSafely({
            to: userObj.email,
            from: this.configService.get('SMTP_MAIL_FROM'),
            subject: `Email Verification Code`,
            html: compiled({ msgData })
        })
    }

    /**
     * SEND A CODE TO RECOVER FOR EMAIL VERIFICATION
     */
    async shareDocumentLink(
        email: string,
        name: string,
        link: string,
        documentType?: string
    ): Promise<void> {
        const message = `
        Dear ${name},

        I hope this message finds you well. I am writing to share a ${documentType} document link with you. You can access the ${documentType} by clicking on the link below:

        ${link}

        Please let me know if you encounter any issues or require further assistance. Thank you for your attention.

        Best regards,
        Kitty Support Team.`

        const msgData = {
            recipient: name,
            title: `Kitty ${documentType}.`,
            message: message,
            redirectTo: `${process.env.APP_URL}`,
            btnTitle: 'Go To Kitty'
        }

        // const template = path.join(__dirname, 'templates', 'email-template.hbs')
        // EMAIL TEMPLATE
        const template = path.join(
            __dirname,
            '..',
            'templates',
            'email-template.hbs'
        )
        const source = await fs.readFile(template, 'utf-8')
        const compiled = hbs.compile(source)

        return this.transporter.sendMail({
            to: email,
            from: this.configService.get('SMTP_MAIL_FROM'),
            subject: `${documentType} Link Sharing`,
            html: compiled({ msgData })
        })
    }

    // Create a simple test method that can be called from a controller
    async testEmailService(): Promise<{ success: boolean; message: string }> {
        if (!this.isEmailEnabled) {
            return {
                success: false,
                message:
                    'Email service is disabled. Set ENABLE_EMAIL_SERVICE=true in .env to enable.'
            }
        }

        try {
            await this.transporter.verify()
            this.logger.log('Email service test successful')
            return {
                success: true,
                message: 'Email service is properly configured'
            }
        } catch (error) {
            this.logger.error('Email service test failed:', error)
            return {
                success: false,
                message: `Email service test failed: ${error.message}. Please follow the setup instructions in the console logs.`
            }
        }
    }
}
