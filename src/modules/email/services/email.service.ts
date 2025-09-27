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
        // Always enable email service for forget password functionality
        this.logger.log(
            'Initializing email service for forget password functionality'
        )

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

            // Don't verify connection automatically - only when sending emails
            this.isEmailEnabled = true
            this.logger.log(
                '✅ Email service initialized successfully (connection will be established when needed)'
            )
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

        ${organizationName} has invited to join Xeo Live as ${roleName}. You can collaborate with your team in real-time to manage organizational bookkeeping. Please click on the following link to get started:
        ${process.env.CLIENT_APP_URL}/auth?invitation=accepted&invitation-code=${uuid}

        If you need any assistance, contact us at info@anchorblock.vc

        Best regards,
        Xeo Live Organization`

        const msgData = {
            recipient: userName,
            title: `You have been added to ${organizationName} on Xeo Live`,
            message: message,
            redirectTo: `${process.env.APP_URL}`,
            btnTitle: 'Back To Xeo Live'
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
        const message = `To reset your password, please verify your identity by entering the following verification code in your mobile app:

**${code}**

This code will expire in 5 minutes for your security. If you didn't request a password reset, please ignore this email.

Thank you for using our app.

Best regards,
Support Team`

        const msgData = {
            recipient: userObj.name || 'User',
            title: `Password Reset Verification Code`,
            message: message,
            redirectTo: null, // No redirect for mobile app
            btnTitle: null, // No button for mobile app
            code: code,
            expiryTime: '5 minutes'
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
            subject: `Password Reset Verification Code`,
            html: compiled({ msgData })
        })
    }

    /**
     * SEND A CODE FOR EMAIL VERIFICATION WITH CONNECTION MANAGEMENT
     */
    async sendEmailVerificationCode(userObj: User, code: number) {
        const message = `Thank you for signing up! To ensure the security of your account, please verify your email address by entering this verification code in your mobile app:

**${code}**

This code will expire in 5 minutes. If you didn't sign up for an account, please ignore this email.

Best regards,
Support Team`

        const msgData = {
            recipient: userObj.name || 'User',
            title: `Email Verification Code`,
            message: message,
            redirectTo: null, // No redirect for mobile app
            btnTitle: null, // No button for mobile app
            code: code,
            expiryTime: '5 minutes'
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

        // Use sendEmailSafely which manages SMTP connection automatically
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
        Xeo Live Support Team.`

        const msgData = {
            recipient: name,
            title: `Xeo Live ${documentType}.`,
            message: message,
            redirectTo: `${process.env.APP_URL}`,
            btnTitle: 'Go To Xeo Live'
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
