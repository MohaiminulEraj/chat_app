import {
    ConflictException,
    Injectable,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcryptjs'
import { Repository, Not } from 'typeorm'
import {
    paginate,
    Pagination,
    IPaginationOptions
} from 'nestjs-typeorm-paginate'
import { CloudinaryService } from '../cloudinary/cloudinary.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'
import { ProfileVisit } from './entities/profile-visit.entity'
import {
    UserAchievementData,
    AchievementItem
} from './interfaces/achievement.interface'
import {
    Friendship,
    FriendshipStatus
} from '../friendship/entities/friendship.entity'

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Friendship)
        private friendshipRepository: Repository<Friendship>,
        @InjectRepository(ProfileVisit)
        private profileVisitRepository: Repository<ProfileVisit>,
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

    async findOneWithVisitTracking(
        id: string,
        visitorId?: string
    ): Promise<User> {
        const user = await this.findOne(id)

        // Record the visit if visitorId is provided and different from the profile owner
        if (visitorId && visitorId !== id) {
            await this.recordProfileVisit(visitorId, id)
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
        try {
            const user = await this.findOne(id)

            // Handle avatar upload if file is provided
            if (avatarFile) {
                // Delete old avatar if exists
                if (user.avatarUrl) {
                    try {
                        // Extract public_id from the URL
                        const urlParts = user.avatarUrl.split('/')
                        const publicIdWithExtension =
                            urlParts[urlParts.length - 1]
                        const publicId = publicIdWithExtension.split('.')[0]
                        const folderPath = urlParts.slice(-2, -1)[0]
                        await this.cloudinaryService.deleteFile(
                            `${folderPath}/${publicId}`
                        )
                    } catch (error) {
                        console.error('Failed to delete old avatar:', error)
                        // Don't throw here, continue with upload
                    }
                }

                try {
                    // Upload new avatar
                    const uploadResult =
                        await this.cloudinaryService.uploadImage(avatarFile, {
                            folder:
                                (process.env.CLOUDINARY_FOLDER ?? 'kitty') +
                                '/avatars',
                            transformation: {
                                width: 500,
                                height: 500,
                                crop: 'fill',
                                gravity: 'face'
                            }
                        })
                    updateData.avatarUrl = uploadResult.secure_url
                } catch (error) {
                    console.error('Failed to upload avatar:', error)
                    throw new ConflictException('Failed to upload avatar image')
                }
            }

            // Hash password if provided
            if (updateData.password) {
                updateData.password = await bcrypt.hash(updateData.password, 10)
            }

            // Update user with new data
            Object.assign(user, updateData)

            try {
                const savedUser = await this.userRepository.save(user)
                return Array.isArray(savedUser) ? savedUser[0] : savedUser
            } catch (error) {
                console.error('Database save error:', error)

                // Check for duplicate email error
                if (error.code === '23505' && error.detail?.includes('email')) {
                    throw new ConflictException('Email already exists')
                }

                throw new ConflictException('Failed to save user updates')
            }
        } catch (error) {
            // Re-throw known exceptions
            if (
                error instanceof NotFoundException ||
                error instanceof ConflictException
            ) {
                throw error
            }

            console.error('Unexpected error in user update:', error)
            throw new ConflictException(
                'An unexpected error occurred during user update'
            )
        }
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

    async getRecommendations(
        currentUserId: string,
        options: IPaginationOptions
    ): Promise<Pagination<User>> {
        const queryBuilder = this.userRepository
            .createQueryBuilder('user')
            .where('user.uuid != :currentUserId', { currentUserId })
            .andWhere('user.isActive = :isActive', { isActive: true })
            .select([
                'user.id',
                'user.uuid',
                'user.name',
                'user.email',
                'user.displayName',
                'user.avatarUrl',
                'user.bio',
                'user.status'
            ])

        return await paginate<User>(queryBuilder, options)
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

    async getUserAchievementData(userId: string): Promise<UserAchievementData> {
        const user = await this.userRepository.findOne({
            where: { uuid: userId, isActive: true },
            select: [
                'uuid',
                'name',
                'email',
                'displayName',
                'avatarUrl',
                'coverImage',
                'country',
                'level',
                'balance',
                'frameId',
                'frameImage',
                'badge',
                'purchasedGifts',
                'entryEffects',
                'frames'
            ]
        })

        if (!user) {
            throw new NotFoundException('User not found')
        }

        // Get friends (accepted friendships)
        const friendships = await this.friendshipRepository.find({
            where: [
                { userId: userId, status: FriendshipStatus.ACCEPTED },
                { friendId: userId, status: FriendshipStatus.ACCEPTED }
            ]
        })

        // Get followers (people who sent friend requests to this user)
        const followerFriendships = await this.friendshipRepository.find({
            where: { friendId: userId, status: FriendshipStatus.ACCEPTED }
        })

        // Get following (people this user sent friend requests to)
        const followingFriendships = await this.friendshipRepository.find({
            where: { userId: userId, status: FriendshipStatus.ACCEPTED }
        })

        // Get visitor count (exclude the user himself)
        const visitorCount = await this.profileVisitRepository.count({
            where: {
                visitedUserId: userId,
                visitorId: Not(userId) // Exclude visits from the user himself
            }
        })

        // Transform the data to match the required JSON structure
        return {
            _id: user.uuid,
            userId: user.uuid,
            name: user.displayName || user.name || '',
            country: user.country || '',
            email: user.email,
            image: user.avatarUrl || '',
            coverImage: user.coverImage || '',
            level: user.level || 0,
            balance: user.balance || 0,
            frameId: user.frameId || null,
            frameImage: user.frameImage || null,
            badge: user.badge || [],
            gift: user.purchasedGifts || [],
            entryEffect: user.entryEffects || [],
            frame: user.frames || [],
            friend: friendships.length,
            follower: followerFriendships.length,
            following: followingFriendships.length,
            visitorCount: visitorCount
        }
    }

    async updateUserAchievements(
        userId: string,
        achievementUpdates: {
            purchasedGifts?: AchievementItem[]
            entryEffects?: AchievementItem[]
            frames?: AchievementItem[]
            level?: number
            balance?: number
            frameId?: string
            frameImage?: string
            badge?: string[]
        }
    ): Promise<User> {
        const user = await this.findOne(userId)

        // Update achievement fields
        if (achievementUpdates.purchasedGifts !== undefined) {
            user.purchasedGifts = achievementUpdates.purchasedGifts
        }
        if (achievementUpdates.entryEffects !== undefined) {
            user.entryEffects = achievementUpdates.entryEffects
        }
        if (achievementUpdates.frames !== undefined) {
            user.frames = achievementUpdates.frames
        }
        if (achievementUpdates.level !== undefined) {
            user.level = achievementUpdates.level
        }
        if (achievementUpdates.balance !== undefined) {
            user.balance = achievementUpdates.balance
        }
        if (achievementUpdates.frameId !== undefined) {
            user.frameId = achievementUpdates.frameId
        }
        if (achievementUpdates.frameImage !== undefined) {
            user.frameImage = achievementUpdates.frameImage
        }
        if (achievementUpdates.badge !== undefined) {
            user.badge = achievementUpdates.badge
        }

        const savedUser = await this.userRepository.save(user)
        return Array.isArray(savedUser) ? savedUser[0] : savedUser
    }

    async recordProfileVisit(
        visitorId: string,
        visitedUserId: string
    ): Promise<void> {
        // Don't record if user is visiting their own profile
        if (visitorId === visitedUserId) {
            return
        }

        try {
            // Check if visit already exists
            const existingVisit = await this.profileVisitRepository.findOne({
                where: { visitorId, visitedUserId }
            })

            if (existingVisit) {
                // Update last visit time
                existingVisit.lastVisitAt = new Date()
                await this.profileVisitRepository.save(existingVisit)
            } else {
                // Create new visit record
                const visit = this.profileVisitRepository.create({
                    visitorId,
                    visitedUserId,
                    lastVisitAt: new Date()
                })
                await this.profileVisitRepository.save(visit)
            }
        } catch (error) {
            // Log error but don't throw - profile visits shouldn't break the main functionality
            console.error('Failed to record profile visit:', error)
        }
    }
}
