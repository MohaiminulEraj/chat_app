import {
    HttpException,
    HttpStatus,
    Inject,
    Injectable,
    InternalServerErrorException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { LoggedInUser } from 'src/modules/user/data/logged-in-user.type'
import { Repository } from 'typeorm'
import { EmailService } from '../../email/services/email.service'
import { User } from '../../user/entities/user.entity'
import {
    EmailVerificationDto,
    ForgetPasswordDto,
    LoginDto,
    RegistrationDto,
    UpdatePasswordDto,
    VerificationCodeSenderDto
} from '../dto/auth.dto'
import { LoginLog } from '../entities/login-log.entity'
import { JwtService } from './jwt.service'

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(LoginLog)
        private readonly loginLogRepository: Repository<LoginLog>,
        @Inject(JwtService)
        private readonly jwtService: JwtService,
        private readonly emailService: EmailService
    ) {}

    // Add validateUser method for compatibility with LocalStrategy
    async validateUser(emailOrPhone: string, password: string): Promise<any> {
        const loginDto = { emailOrPhone, password }

        try {
            const result = await this.login({}, loginDto)
            return result // Return the full result including user info
        } catch (error) {
            return null // Return null if validation fails
        }
    }

    async login(req: any, loginDto: LoginDto) {
        if (loginDto.password.length < 8) {
            throw new HttpException(
                'Password must be at least 8 characters long',
                HttpStatus.BAD_REQUEST
            )
        }
        // Check if the input is email or phone number
        const isEmail = loginDto.emailOrPhone.includes('@')

        const searchCondition = isEmail
            ? { email: loginDto.emailOrPhone }
            : { phoneNumber: loginDto.emailOrPhone }

        const user: User = await this.getAUser(searchCondition)

        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND)
        }
        try {
            const isPasswordValid: boolean = this.jwtService.isPasswordValid(
                loginDto.password,
                user.password
            )
            if (!isPasswordValid) {
                throw new HttpException(
                    'Invalid User credentials',
                    HttpStatus.BAD_REQUEST
                )
            }
        } catch (error) {
            throw new HttpException(
                'Invalid User credentials',
                HttpStatus.BAD_REQUEST
            )
        }

        // KEEPING LOG
        this.logging(user, req)
        return await this.unifiedAuthResponse(user)
    }

    /**
     * REGISTRATION
     *
     * @param   {RegistrationDto}  registrationDto  [registrationDto description]
     *
     * @return  {[type]}                            [return description]
     */
    async registration(registrationDto: RegistrationDto) {
        if (registrationDto.password.length < 8) {
            throw new HttpException(
                'Password must be at least 8 characters long',
                HttpStatus.BAD_REQUEST
            )
        }
        if (registrationDto.password != registrationDto.confirmPassword) {
            throw new HttpException(
                'Password Mismatched',
                HttpStatus.BAD_REQUEST
            )
        }

        // Check if email already exists
        const existingEmailUser = await this.userRepository.findOne({
            where: {
                email: registrationDto.email
            }
        })

        if (existingEmailUser) {
            throw new HttpException('Email already exists', HttpStatus.CONFLICT)
        }

        // Check if phone number already exists
        const existingPhoneUser = await this.userRepository.findOne({
            where: {
                phoneNumber: registrationDto.phoneNumber
            }
        })

        if (existingPhoneUser) {
            throw new HttpException(
                'Phone number already exists',
                HttpStatus.CONFLICT
            )
        }

        try {
            let userToRegister: User

            const salt = await bcrypt.genSaltSync(10)
            const hashedPassword = await bcrypt.hash(
                registrationDto.password,
                salt
            )

            userToRegister = new User()
            userToRegister.name = registrationDto.name
            userToRegister.email = registrationDto.email
            userToRegister.phoneNumber = registrationDto.phoneNumber
            userToRegister.password = hashedPassword

            const registeredUser =
                await this.userRepository.save(userToRegister)

            // GENERATE A VERIFICATION CODE AND SEND MAIL
            // const verificationCodeSenderDto = new VerificationCodeSenderDto()
            // verificationCodeSenderDto.email = registrationDto.email
            // await this.generateEmailVerificationCode(verificationCodeSenderDto)

            return await this.unifiedAuthResponse(registeredUser)
        } catch (error) {
            console.log(error)
            throw new HttpException(
                'An error occurred while registering a user',
                HttpStatus.BAD_REQUEST
            )
        }
    }

    /**
     * FIRSTLY SEND A VERIFICATION CODE TO THE EMAIL
     *
     * @param   {string}  email  [email description]
     *
     * @return  {[type]}         [return description]
     */
    async generateEmailVerificationCode(
        verificationCodeSenderDto: VerificationCodeSenderDto
    ) {
        const currentTimestamp = new Date().getTime()
        const user = await this.getAUser({
            email: verificationCodeSenderDto.email
        })

        if (user && !user.isEmailVerified) {
            if (user.code && currentTimestamp < user.codeExpiredAt) {
                throw new HttpException(
                    'You can not generate another code before the last one get expired',
                    HttpStatus.BAD_REQUEST
                )
            }
            const code = Math.floor(Math.random() * 900000) + 100000
            const result = await this.emailService.sendEmailVerificationCode(
                user,
                code
            )

            if (result.accepted.length) {
                user.code = code.toString()
                user.codeExpiredAt = new Date().getTime() + 2 * 60 * 1000
                user.hash = crypto.randomBytes(32).toString('hex')
                try {
                    return await this.userRepository.save(user)
                } catch (error) {}
                return true
            }

            throw new HttpException(
                'The email is not sent for some reason',
                HttpStatus.BAD_GATEWAY
            )
        }

        throw new HttpException(
            'Non verified user not found',
            HttpStatus.BAD_REQUEST
        )
    }

    /**
     * REFRESHING TOKEN FOR AN EXISTING USER
     */
    public async refreshToken(loggedInUser: LoggedInUser) {
        const user = await this.unifiedAuthResponse(
            await this.getAUser({ id: loggedInUser.id })
        )
        return user
    }

    /**
     * THEN VERIFY THE CODE AND ENABLE THE USER FOR USE THIS APPLICATION
     *
     * @param   {ForgetPasswordDto}  forgetPasswordDto  [forgetPasswordDto description]
     *
     * @return  {[type]}                                [return description]
     */
    async emailVerification(emailVerificationDto: EmailVerificationDto) {
        if (!emailVerificationDto.code || !emailVerificationDto.email) {
            throw new HttpException(
                'Please provide both the verification code and email',
                HttpStatus.BAD_REQUEST
            )
        }

        const currentTimestamp = new Date().getTime()
        const user = await this.getAUser({
            email: emailVerificationDto.email,
            code: emailVerificationDto.code
        })

        if (user) {
            if (currentTimestamp > user.codeExpiredAt) {
                throw new HttpException(
                    'Sorry the time for entering the code is expired',
                    HttpStatus.BAD_REQUEST
                )
            }
            user.isEmailVerified = true

            await this.userRepository.save(user)
            return await this.unifiedAuthResponse(user)
        }
        throw new HttpException('Invalid code or user', HttpStatus.BAD_REQUEST)
    }

    /**
     * GET A USER
     */
    async getAUser(condition: any) {
        return await this.userRepository.findOne({
            select: {
                id: true,
                uuid: true,
                email: true,
                phoneNumber: true,
                password: true,
                name: true,
                // Remove username: true,
                avatarUrl: true,
                isEmailVerified: true,
                isPhoneVerified: true,
                userType: true,
                authProvider: true
            },
            where: condition
        })
    }

    /**
     * UNIFIED RESPONSE FOR AUTH
     */
    async unifiedAuthResponse(user: User | any) {
        const token: string = this.jwtService.generateToken(user)
        return {
            id: user.id,
            uuid: user.uuid,
            // Remove username: user.username,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            token: token,
            userType: user.userType,
            authProvider: user.authProvider,
            avatarUrl: user.avatarUrl,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified
        }
    }

    /**
     * LOGGING AUTHENTICATED USER
     */
    async logging(user: User, requestObject: any) {
        try {
            const loginLog = new LoginLog()
            loginLog.userId = user.uuid // Use uuid instead of id
            loginLog.time = new Date()
            const ip =
                requestObject.headers['x-forwarded-for'] ||
                requestObject.connection?.remoteAddress ||
                requestObject.ip ||
                'unknown'
            loginLog.ip = ip.toString().split(':').pop() || 'unknown'
            await this.loginLogRepository.save(loginLog)
        } catch (error) {
            // Log the error but don't throw - login should still succeed
            console.error('Failed to log user login:', error.message)
        }
    }

    /**
     * FIRSTLY SEND A VERIFICATION CODE TO THE EMAIL
     *
     * @param   {string}  email  [email description]
     *
     * @return  {[type]}         [return description]
     */
    async forgetPassword(verificationCodeSenderDto: VerificationCodeSenderDto) {
        const currentTimestamp = new Date().getTime()
        const user = await this.getAUser({
            email: verificationCodeSenderDto.email
        })

        if (user) {
            if (user.code && currentTimestamp < user.codeExpiredAt) {
                throw new HttpException(
                    'You can not generate another code before the last one get expired',
                    HttpStatus.BAD_REQUEST
                )
            }
            const code = Math.floor(Math.random() * 900000) + 100000
            const result = await this.emailService.sendForgetPasswordCode(
                user,
                code
            )

            if (result.accepted.length) {
                user.code = code.toString()
                user.codeExpiredAt = new Date().getTime() + 2 * 60 * 1000
                user.hash = crypto.randomBytes(32).toString('hex')
                try {
                    return await this.userRepository.save(user)
                } catch (error) {}
                return true
            }

            throw new HttpException(
                'The email is not sent for some reason',
                HttpStatus.BAD_GATEWAY
            )
        }

        throw new HttpException('User not found', HttpStatus.BAD_REQUEST)
    }

    /**
     * THEN VERIFY THE CODE AND ENABLE THE PASSWORD RECOVERY OPTION
     *
     * @param   {ForgetPasswordDto}  forgetPasswordDto  [forgetPasswordDto description]
     *
     * @return  {[type]}                                [return description]
     */
    async codeVerification(forgetPasswordDto: ForgetPasswordDto) {
        const currentTimestamp = new Date().getTime()
        const user = await this.userRepository.findOne({
            where: {
                email: forgetPasswordDto.email,
                code: forgetPasswordDto.code
            }
        })

        if (user) {
            if (currentTimestamp > user.codeExpiredAt) {
                throw new HttpException(
                    'Sorry the time for entering the code is expired',
                    HttpStatus.BAD_REQUEST
                )
            }
            return user
        }
        throw new HttpException('Invalid code or user', HttpStatus.BAD_REQUEST)
    }

    /**
     * RECOVER THE PASSWORD WITH SETTING A NEW ONE
     *
     * @param   {UpdatePasswordDto}  updatePasswordDto  [updatePasswordDto description]
     *
     * @return  {[type]}                                [return description]
     */
    async recoverPassword(updatePasswordDto: UpdatePasswordDto) {
        const user = await this.userRepository.findOne({
            where: {
                hash: updatePasswordDto.hash,
                uuid: updatePasswordDto.userUuid
            }
        })
        if (user) {
            try {
                const newEncodedPassword = this.jwtService.encodePassword(
                    updatePasswordDto.newPassword
                )
                const isPasswordValid: boolean =
                    this.jwtService.isPasswordValid(
                        updatePasswordDto.confirmPassword,
                        newEncodedPassword
                    )
                if (!isPasswordValid) {
                    // IF PASSWORD DOES NOT MATCH
                    throw new HttpException(
                        'Password Mismatched',
                        HttpStatus.BAD_REQUEST
                    )
                }
                user.password = newEncodedPassword
                await this.userRepository.save(user)
                return true
            } catch (error) {
                throw new InternalServerErrorException('An error occurred')
            }
        }
        throw new HttpException('Invalid User', HttpStatus.BAD_REQUEST)
    }
}
