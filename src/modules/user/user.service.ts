import {
    ConflictException,
    Injectable,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import { Repository } from 'typeorm'
import { CloudinaryService } from '../cloudinary/cloudinary.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private cloudinaryService: CloudinaryService
    ) {}

    async create(createUserDto: CreateUserDto): Promise<User> {
        // Check if user already exists
        const existingUser = await this.userRepository.findOne({
            where: [{ email: createUserDto.email }]
        })

        if (existingUser) {
            throw new ConflictException('User with this email already exists')
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10)

        const user = this.userRepository.create({
            ...createUserDto,
            password: hashedPassword
        })

        const savedUser = await this.userRepository.save(user)
        return Array.isArray(savedUser) ? savedUser[0] : savedUser
    }

    async findByEmail(email: string): Promise<User | undefined> {
        return this.userRepository.findOne({
            where: { email },
            select: [
                'id',
                'uuid',
                'email',
                'displayName',
                'avatarUrl',
                'name',
                'phoneNumber',
                'isEmailVerified',
                'isPhoneVerified'
            ]
        })
    }

    async findOne(id: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { uuid: id } })
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`)
        }
        return user
    }

    async findAll(): Promise<User[]> {
        // Instead of using select with potentially incorrect property names,
        // fetch all users and let TypeORM handle the property mapping
        return this.userRepository.find({
            where: { isActive: true }
        })
    }

    async update(
        id: string,
        updateData: UpdateUserDto,
        avatarFile?: Express.Multer.File
    ): Promise<User> {
        const user = await this.findOne(id)

        // Handle avatar upload if file is provided
        if (avatarFile) {
            // Delete old avatar if exists
            if (user.avatarUrl) {
                try {
                    // Extract public_id from the URL
                    const urlParts = user.avatarUrl.split('/')
                    const publicIdWithExtension = urlParts[urlParts.length - 1]
                    const publicId = publicIdWithExtension.split('.')[0]
                    const folderPath = urlParts.slice(-2, -1)[0]
                    await this.cloudinaryService.deleteFile(
                        `${folderPath}/${publicId}`
                    )
                } catch (error) {
                    console.error('Failed to delete old avatar:', error)
                }
            }

            // Upload new avatar
            const uploadResult = await this.cloudinaryService.uploadImage(
                avatarFile,
                {
                    folder:
                        (process.env.CLOUDINARY_FOLDER ?? 'kitty') + '/avatars',
                    transformation: {
                        width: 500,
                        height: 500,
                        crop: 'fill',
                        gravity: 'face'
                    }
                }
            )
            updateData.avatarUrl = uploadResult.secure_url
        }

        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10)
        }

        Object.assign(user, updateData)
        const savedUser = await this.userRepository.save(user)
        return Array.isArray(savedUser) ? savedUser[0] : savedUser
    }

    async updateStatus(
        id: string,
        status: 'online' | 'offline' | 'away' | 'busy'
    ): Promise<User> {
        const user = await this.userRepository.findOne({ where: { uuid: id } })

        if (!user) {
            throw new NotFoundException('User not found')
        }

        user.status = status
        user.lastSeenAt = new Date()

        return await this.userRepository.save(user)
    }

    async remove(id: string): Promise<void> {
        const result = await this.userRepository.update(
            { uuid: id },
            { isActive: false }
        )
        if (result.affected === 0) {
            throw new NotFoundException(`User with ID ${id} not found`)
        }
    }

    async searchUsers(query: string): Promise<User[]> {
        return this.userRepository
            .createQueryBuilder('user')
            .where('user.displayName ILIKE :query OR user.email ILIKE :query', {
                query: `%${query}%`
            })
            .andWhere('user.isActive = :isActive', { isActive: true })
            .select([
                'user.uuid',
                'user.email',
                'user.displayName',
                'user.avatarUrl',
                'user.status'
            ])
            .getMany()
    }
}
