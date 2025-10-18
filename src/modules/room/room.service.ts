import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { CloudinaryService } from '../cloudinary/cloudinary.service'
import { GroupMember } from '../group/entities/group-member.entity'
import { Group } from '../group/entities/group.entity'
import { User } from '../user/entities/user.entity'
import { Gift } from '../gift/entities/gift.entity'
import { RoomBlockedUser } from './entities/room-blocked-user.entity'
import { RoomComment } from './entities/room-comment.entity'
import { RoomParticipant } from './entities/room-participant.entity'
import { RoomRole, RoomRoleAssignment } from './entities/room-role.entity'
import { RoomSeat } from './entities/room-seat.entity'
import { RoomWaitingList } from './entities/room-waiting-list.entity'
import { RoomActivityTracking } from './entities/room-activity-tracking.entity'
import { Room } from './entities/room.entity'
import { UserProfileStats } from '../user/entities/user-profile-stats.entity'
import { GiftTransaction } from '../gift/entities/gift-transaction.entity'
import {
    Friendship,
    FriendshipStatus
} from '../friendship/entities/friendship.entity'
import {
    PKBattle,
    PKBattleStatus,
    PKBattleType
} from './entities/pk-battle.entity'
import {
    PKBattleParticipant,
    PKBattleParticipantStatus
} from './entities/pk-battle-participant.entity'
import { PKBattleGift } from './entities/pk-battle-gift.entity'

@Injectable()
export class RoomService {
    private readonly logger = new Logger(RoomService.name)

    constructor(
        @InjectRepository(Room)
        private roomRepository: Repository<Room>,
        @InjectRepository(RoomParticipant)
        private participantRepository: Repository<RoomParticipant>,
        @InjectRepository(RoomWaitingList)
        private waitingListRepository: Repository<RoomWaitingList>,
        @InjectRepository(GroupMember)
        private groupMemberRepository: Repository<GroupMember>,
        @InjectRepository(Group)
        private groupRepository: Repository<Group>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(RoomRoleAssignment)
        private roomRoleRepository: Repository<RoomRoleAssignment>,
        @InjectRepository(RoomSeat)
        private roomSeatRepository: Repository<RoomSeat>,
        @InjectRepository(RoomComment)
        private roomCommentRepository: Repository<RoomComment>,
        @InjectRepository(RoomBlockedUser)
        private roomBlockedUserRepository: Repository<RoomBlockedUser>,
        @InjectRepository(PKBattle)
        private pkBattleRepository: Repository<PKBattle>,
        @InjectRepository(PKBattleParticipant)
        private pkBattleParticipantRepository: Repository<PKBattleParticipant>,
        @InjectRepository(PKBattleGift)
        private pkBattleGiftRepository: Repository<PKBattleGift>,
        @InjectRepository(Gift)
        private giftRepository: Repository<Gift>,
        @InjectRepository(RoomActivityTracking)
        private roomActivityTrackingRepository: Repository<RoomActivityTracking>,
        @InjectRepository(UserProfileStats)
        private userProfileStatsRepository: Repository<UserProfileStats>,
        @InjectRepository(GiftTransaction)
        private giftTransactionRepository: Repository<GiftTransaction>,
        @InjectRepository(Friendship)
        private friendshipRepository: Repository<Friendship>,
        private cloudinaryService: CloudinaryService
    ) {}

    /**
     * Transform multipart form data to proper types with validation
     */
    private transformMultipartData(data: any): any {
        // Validate required fields
        if (!data.groupId || !data.name) {
            throw new BadRequestException(
                'groupId and name are required fields'
            )
        }

        // Validate and transform maxSeats
        let maxSeats = 8 // default
        if (data.maxSeats !== undefined && data.maxSeats !== '') {
            const parsedMaxSeats = parseInt(data.maxSeats, 10)
            if (isNaN(parsedMaxSeats) || ![6, 8, 10].includes(parsedMaxSeats)) {
                throw new BadRequestException('maxSeats must be 6, 8, or 10')
            }
            maxSeats = parsedMaxSeats
        }

        // Validate and transform isPrivate
        let isPrivate = false // default
        if (data.isPrivate !== undefined && data.isPrivate !== '') {
            if (data.isPrivate === 'true') {
                isPrivate = true
            } else if (data.isPrivate === 'false') {
                isPrivate = false
            } else {
                throw new BadRequestException(
                    'isPrivate must be "true" or "false"'
                )
            }
        }

        // Validate UUID format for groupId
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(data.groupId)) {
            throw new BadRequestException(
                'Invalid groupId format. Must be a valid UUID'
            )
        }

        return {
            groupId: data.groupId.trim(),
            name: data.name.trim(),
            description: data.description ? data.description.trim() : undefined,
            maxSeats,
            isPrivate,
            password: data.password ? data.password.trim() : undefined,
            type: data.type ? data.type.trim() : 'voice'
        }
    }

    async findUserById(userId: string): Promise<User | null> {
        try {
            return await this.userRepository.findOne({
                where: { uuid: userId, isActive: true },
                select: ['uuid', 'name', 'email'] // Select only needed fields
            })
        } catch (error) {
            return null
        }
    }

    async createRoom(
        groupId: string,
        data: any,
        currentUser?: any,
        avatarFile?: Express.Multer.File
    ): Promise<Room> {
        try {
            // Transform multipart form data to proper types
            const transformedData = this.transformMultipartData(data)

            // Debug: Log the incoming data to understand multipart form parsing
            console.log('🔍 CreateRoom Debug Data:', {
                groupId,
                originalData: data,
                transformedData,
                currentUser: currentUser?.uuid,
                avatarFile: avatarFile
                    ? {
                          fieldname: avatarFile.fieldname,
                          originalname: avatarFile.originalname,
                          mimetype: avatarFile.mimetype,
                          size: avatarFile.size
                      }
                    : null
            })

            // Validate that the group exists
            const group = await this.groupRepository.findOne({
                where: { uuid: groupId }
            })

            if (!group) {
                throw new NotFoundException(
                    `Group with ID ${groupId} not found`
                )
            }

            // Validate that the user exists
            const userId = currentUser?.uuid || transformedData.ownerId
            if (!userId) {
                throw new BadRequestException('Owner ID is required')
            }

            const user = await this.userRepository.findOne({
                where: { uuid: userId, isActive: true }
            })

            if (!user) {
                throw new NotFoundException(`User with ID ${userId} not found`)
            }

            // Check if user is a member of the group
            const groupMember = await this.groupMemberRepository.findOne({
                where: { groupId, userId }
            })

            if (!groupMember) {
                throw new ForbiddenException(
                    'You must be a member of the group to create a room'
                )
            }

            // Parse and validate maxSeats (already parsed in transformedData)
            const maxSeats = transformedData.maxSeats || 8
            if (![6, 8, 10].includes(maxSeats)) {
                throw new BadRequestException(
                    'maxSeats must be either 6, 8, or 10'
                )
            }

            // Parse boolean values (already parsed in transformedData)
            const isPrivate = transformedData.isPrivate

            let roomAvatarUrl: string | null = null

            // Handle avatar upload if provided
            if (avatarFile) {
                // Validate file type and size - Support for all common image formats
                const allowedMimeTypes = [
                    // JPEG formats
                    'image/jpeg',
                    'image/jpg',
                    'image/pjpeg', // Progressive JPEG

                    // PNG formats
                    'image/png',
                    'image/x-png',

                    // GIF formats
                    'image/gif',

                    // WebP formats
                    'image/webp',

                    // BMP formats
                    'image/bmp',
                    'image/x-bmp',
                    'image/x-bitmap',
                    'image/x-win-bitmap',
                    'image/x-windows-bmp',
                    'image/ms-bmp',

                    // TIFF formats
                    'image/tiff',
                    'image/tif',
                    'image/x-tiff',

                    // SVG formats
                    'image/svg+xml',
                    'image/svg',

                    // Modern formats
                    'image/avif',
                    'image/heic',
                    'image/heif',

                    // Icon formats
                    'image/x-icon',
                    'image/vnd.microsoft.icon',
                    'image/ico',

                    // Additional formats
                    'image/jfif',
                    'image/pjp',
                    'image/jpg2',
                    'image/jp2'
                ]

                if (!allowedMimeTypes.includes(avatarFile.mimetype)) {
                    throw new BadRequestException(
                        'Invalid file type. Please upload a valid image file (JPEG/JPG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO, JFIF)'
                    )
                }

                // Check file size (10MB limit)
                const maxSize = 10 * 1024 * 1024 // 10MB in bytes
                if (avatarFile.size > maxSize) {
                    throw new BadRequestException(
                        'File size too large. Maximum size allowed is 10MB'
                    )
                }

                try {
                    // Upload to Cloudinary
                    const uploadResult =
                        await this.cloudinaryService.uploadImage(avatarFile, {
                            folder: 'kitty/rooms/avatars',
                            public_id: `room-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                            transformation: {
                                width: 400,
                                height: 400,
                                crop: 'fill',
                                gravity: 'face',
                                quality: 'auto'
                            }
                        })

                    roomAvatarUrl = uploadResult.secure_url
                } catch (error) {
                    console.error('Room avatar upload error:', error)
                    throw new BadRequestException(
                        `Failed to upload room avatar: ${error.message}`
                    )
                }
            }

            const room = this.roomRepository.create({
                ...transformedData,
                groupId,
                maxSeats,
                ownerId: userId,
                isLocked: isPrivate,
                password: isPrivate ? transformedData.password : null,
                roomAvatarUrl
            })

            const savedRoom = await this.roomRepository.save(room)
            const finalRoom = Array.isArray(savedRoom)
                ? savedRoom[0]
                : savedRoom

            // Initialize seats for the room
            await this.initializeRoomSeats(finalRoom.uuid, maxSeats)

            // If we have a current user, assign them as both owner and host by default
            if (currentUser?.uuid && finalRoom.uuid) {
                try {
                    // Assign owner role
                    await this.assignRoomRole(
                        finalRoom.uuid,
                        currentUser.uuid,
                        RoomRole.OWNER,
                        currentUser.uuid
                    )

                    // Assign host role (group owner is also the host by default)
                    await this.assignRoomRole(
                        finalRoom.uuid,
                        currentUser.uuid,
                        RoomRole.HOST,
                        currentUser.uuid
                    )

                    // Do not auto-occupy any seat for the owner/host
                    // Host will join as observer and can lock/unlock seats as needed
                } catch (error) {
                    console.error('Error assigning default roles:', error)
                    // Continue without throwing error as room is already created
                }
            }

            return finalRoom
        } catch (error) {
            console.error('❌ CreateRoom Error:', error)
            // Re-throw the error to be handled by the controller
            throw error
        }
    }

    async findOne(roomId: string): Promise<Room> {
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId, isActive: true },
            relations: ['participants', 'participants.user', 'owner', 'group']
        })

        if (!room) {
            throw new NotFoundException('Room not found')
        }

        return room
    }

    async joinRoom(
        roomId: string,
        userId: string,
        password?: string,
        seatNumber?: number
    ): Promise<RoomParticipant> {
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId },
            relations: ['participants']
        })

        if (!room) {
            throw new NotFoundException('Room not found')
        }

        // Check if room is private and requires password
        if (room.isLocked && room.password) {
            if (!password || password !== room.password) {
                throw new ForbiddenException(
                    'Invalid password for private room'
                )
            }
        }

        if (room.participants.length >= room.maxSeats) {
            throw new BadRequestException('Room is full')
        }

        // Check if user is already in this specific room
        const existingParticipant = await this.participantRepository.findOne({
            where: {
                roomId: roomId as string,
                userId: userId as string
            }
        })

        if (existingParticipant) {
            this.logger.log(
                `User ${userId} is already in room ${roomId}, returning existing participant info`
            )
            return existingParticipant
        }

        // Determine seat assignment
        let assignedSeat: number

        if (seatNumber !== undefined) {
            // Validate requested seat
            assignedSeat = await this.validateAndAssignSeat(
                roomId,
                seatNumber,
                userId
            )
        } else {
            // Auto-assign next available seat (excluding seat 0 unless user is host/owner)
            assignedSeat = await this.findNextAvailableSeat(roomId, userId)
        }

        const participant = this.participantRepository.create({
            userId,
            roomId,
            seatNumber: assignedSeat + 1 // Convert 0-based to 1-based for storage
        })

        let savedParticipant: RoomParticipant
        try {
            savedParticipant =
                await this.participantRepository.save(participant)
        } catch (err: any) {
            // Handle race condition: another insert may have occurred concurrently
            const isUniqueViolation =
                err &&
                (err.code === '23505' ||
                    (err.detail &&
                        typeof err.detail === 'string' &&
                        err.detail.includes('duplicate key')))
            if (isUniqueViolation) {
                this.logger.warn(
                    `⚠️ Duplicate participant detected for user ${userId} in room ${roomId}. Returning existing participant.`
                )
                const existing = await this.participantRepository.findOne({
                    where: {
                        roomId: roomId as string,
                        userId: userId as string
                    }
                })
                if (existing) {
                    return existing
                }
            }
            throw err
        }

        this.logger.log(
            `✅ Created participant: User ${userId} joined room ${roomId} at seat ${assignedSeat} (stored as ${assignedSeat + 1})`
        )

        // Track room activity for popularity calculations
        await this.trackRoomActivity(roomId, userId)

        // If user sits in seat 0, they become the host
        if (assignedSeat === 0) {
            try {
                // First, remove HOST role from current host (if any)
                const currentHostAssignments =
                    await this.roomRoleRepository.find({
                        where: { roomId, role: RoomRole.HOST, isActive: true }
                    })

                for (const assignment of currentHostAssignments) {
                    await this.removeRoomRole(
                        roomId,
                        assignment.userId,
                        RoomRole.HOST,
                        userId
                    )
                }

                // Assign HOST role to the new user
                await this.assignRoomRole(roomId, userId, RoomRole.HOST, userId)

                this.logger.log(
                    `👑 User ${userId} became host by sitting in seat 0 in room ${roomId}`
                )
            } catch (error) {
                this.logger.warn(
                    `⚠️ Failed to assign host role to user ${userId} in seat 0 of room ${roomId}: ${error.message}`
                )
            }
        }

        return savedParticipant
    }

    /**
     * Join room with specific seat assignment (internal method)
     */
    async joinRoomWithSeat(
        roomId: string,
        userId: string,
        seatIndex: number,
        password?: string
    ): Promise<RoomParticipant> {
        return this.joinRoom(roomId, userId, password, seatIndex)
    }

    async leaveRoom(roomId: string, userId: string): Promise<void> {
        // Find participant in the specific room only
        const participant = await this.participantRepository.findOne({
            where: {
                roomId: roomId as string,
                userId: userId as string
            }
        })

        if (!participant) {
            this.logger.log(
                `ℹ️ leaveRoom: User ${userId} is not a participant in room ${roomId}; skipping removal.`
            )
            return
        }

        this.logger.log(
            `🚪 Removing participant ${userId} from room ${roomId} (seat ${participant.seatNumber})`
        )

        // If leaving seat 0 (host seat), need to transfer host role
        const wasHostSeat = participant.seatNumber === 1 // seat 0 is stored as seatNumber 1

        // Remove participant from this specific room only
        await this.participantRepository.remove(participant)

        // If the leaving user was in seat 0 (host seat), find next person to be host
        if (wasHostSeat) {
            try {
                // Remove host role from leaving user
                await this.removeRoomRole(roomId, userId, RoomRole.HOST, userId)

                // Find someone to be the new host (prefer lowest seat number)
                const remainingParticipants =
                    await this.participantRepository.find({
                        where: { roomId: roomId as string },
                        relations: ['user'],
                        order: { seatNumber: 'ASC' }
                    })

                if (remainingParticipants.length > 0) {
                    const newHostId = remainingParticipants[0].userId
                    await this.assignRoomRole(
                        roomId,
                        newHostId,
                        RoomRole.HOST,
                        userId
                    )

                    this.logger.log(
                        `👑 Host role transferred from ${userId} to ${newHostId} after leaving seat 0`
                    )
                }
            } catch (error) {
                this.logger.warn(
                    `⚠️ Failed to transfer host role after leaving seat 0: ${error.message}`
                )
            }
        }

        // Check waiting list and promote first user for this specific room only
        await this.promoteFromWaitingList(roomId)
    }

    async updateParticipantStatus(
        roomId: string,
        userId: string,
        status: Partial<RoomParticipant>
    ): Promise<void> {
        const result = await this.participantRepository.update(
            {
                roomId: roomId as string,
                userId: userId as string
            },
            status
        )

        if (result.affected === 0) {
            throw new NotFoundException(
                `Participant ${userId} not found in room ${roomId}`
            )
        }
    }

    async updateParticipantStatusBySeat(
        roomId: string,
        seatIndex: number,
        status: Partial<RoomParticipant>
    ): Promise<{ userId: string; userName: string }> {
        // Find participant by seat number in this specific room only
        const participant = await this.participantRepository.findOne({
            where: {
                roomId: roomId as string,
                seatNumber: seatIndex + 1
            },
            relations: ['user']
        })

        if (!participant) {
            throw new NotFoundException(
                `No participant found at seat ${seatIndex} in room ${roomId}`
            )
        }

        // Update the participant status
        const result = await this.participantRepository.update(
            { roomId, userId: participant.userId },
            status
        )

        if (result.affected === 0) {
            throw new NotFoundException('Failed to update participant status')
        }

        return {
            userId: participant.userId,
            userName: participant.user.name
        }
    }

    async kickUserFromSeat(
        roomId: string,
        seatIndex: number,
        kickedBy: string
    ): Promise<{ userId: string; userName: string }> {
        // Check if the user performing the kick has permission
        const userRoles = await this.getUserRolesInRoom(roomId, kickedBy)
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId }
        })

        const isOwner =
            userRoles.includes(RoomRole.OWNER) || room?.ownerId === kickedBy
        const isAdmin = userRoles.includes(RoomRole.ADMIN)
        const isHost = userRoles.includes(RoomRole.HOST)

        // Admins can kick anyone (including hosts), hosts can kick regular users, owners can kick anyone
        const canKick = isOwner || isAdmin || isHost

        if (!canKick) {
            throw new ForbiddenException(
                'Only room owner, admin, or host can kick users'
            )
        }

        // Find participant by seat number in this specific room only
        const participant = await this.participantRepository.findOne({
            where: {
                roomId: roomId as string,
                seatNumber: seatIndex + 1
            },
            relations: ['user']
        })

        // Debug: Let's see what participants exist in this room
        if (!participant) {
            const allParticipants = await this.participantRepository.find({
                where: { roomId: roomId as string },
                relations: ['user']
            })
            console.log(
                `DEBUG: Looking for seat ${seatIndex} (seatNumber ${seatIndex + 1})`
            )
            console.log(
                `DEBUG: Available participants in room ${roomId}:`,
                allParticipants.map((p) => ({
                    userId: p.userId,
                    seatNumber: p.seatNumber,
                    userName: p.user?.name || p.user?.email
                }))
            )
        }

        if (!participant) {
            throw new NotFoundException(
                `No participant found at seat ${seatIndex} (seatNumber ${seatIndex + 1}) in room ${roomId}`
            )
        }

        // Check if trying to kick someone with equal or higher role (unless kicker is owner)
        if (!isOwner) {
            // Check if trying to kick the room owner
            if (participant.userId === room?.ownerId) {
                throw new ForbiddenException('Cannot kick the room owner')
            }

            const targetUserRoles = await this.getUserRolesInRoom(
                roomId,
                participant.userId
            )
            const kickerIsHost = userRoles.includes(RoomRole.HOST)
            const targetIsOwner = targetUserRoles.includes(RoomRole.OWNER)
            const targetIsHost = targetUserRoles.includes(RoomRole.HOST)

            if (targetIsOwner || (kickerIsHost && targetIsHost)) {
                throw new ForbiddenException(
                    'Cannot kick users with equal or higher permissions'
                )
            }
        }
        // Owner can kick anyone, including other hosts

        const kickedUserInfo = {
            userId: participant.userId,
            userName: participant.user.name
        }

        // If kicking from seat 0, need to transfer host role
        const wasHost = seatIndex === 0

        // Remove the participant (same as leaving the room)
        await this.participantRepository.remove(participant)

        // If the kicked user was in seat 0 (host seat), find next person to be host
        if (wasHost) {
            try {
                // Remove host role from kicked user
                await this.removeRoomRole(
                    roomId,
                    participant.userId,
                    RoomRole.HOST,
                    kickedBy
                )

                // Find someone to be the new host (prefer seat 1, then any seated user)
                const remainingParticipants =
                    await this.participantRepository.find({
                        where: { roomId: roomId as string },
                        relations: ['user'],
                        order: { seatNumber: 'ASC' }
                    })

                if (remainingParticipants.length > 0) {
                    const newHostId = remainingParticipants[0].userId
                    await this.assignRoomRole(
                        roomId,
                        newHostId,
                        RoomRole.HOST,
                        kickedBy
                    )

                    this.logger.log(
                        `👑 Host role transferred from ${participant.userId} to ${newHostId} after kick from seat 0`
                    )
                }
            } catch (error) {
                this.logger.warn(
                    `⚠️ Failed to transfer host role after kicking from seat 0: ${error.message}`
                )
            }
        }

        // Check waiting list and promote first user
        await this.promoteFromWaitingList(roomId)

        return kickedUserInfo
    }

    async addToWaitingList(roomId: string, userId: string): Promise<void> {
        // Check if already in waiting list using createQueryBuilder
        const existing = await this.waitingListRepository
            .createQueryBuilder('waitingList')
            .where('waitingList.roomId = :roomId', { roomId: String(roomId) })
            .andWhere('waitingList.userId = :userId', {
                userId: String(userId)
            })
            .getOne()

        if (existing) {
            return
        }

        // Get next position using createQueryBuilder
        const lastInQueue = await this.waitingListRepository
            .createQueryBuilder('waitingList')
            .where('waitingList.roomId = :roomId', { roomId: String(roomId) })
            .orderBy('waitingList.position', 'DESC')
            .getOne()

        const position = lastInQueue ? lastInQueue.position + 1 : 1

        const waitingEntry = this.waitingListRepository.create({
            roomId,
            userId,
            position
        })

        await this.waitingListRepository.save(waitingEntry)
    }

    async promoteFromWaitingList(roomId: string): Promise<void> {
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId },
            relations: ['participants']
        })

        if (!room || room.participants.length >= room.maxSeats) {
            return
        }

        // Get first in waiting list using createQueryBuilder for more control
        const nextUser = await this.waitingListRepository
            .createQueryBuilder('waitingList')
            .where('waitingList.roomId = :roomId', { roomId: String(roomId) })
            .orderBy('waitingList.position', 'ASC')
            .getOne()

        if (!nextUser) {
            return
        }

        // Store position before removing for position updates
        const removedPosition = nextUser.position

        // Remove from waiting list
        await this.waitingListRepository.remove(nextUser)

        // Add as participant - no password needed for promotion from waiting list
        await this.joinRoom(roomId, nextUser.userId)

        // Update positions in waiting list using createQueryBuilder
        const usersToUpdate = await this.waitingListRepository
            .createQueryBuilder('waitingList')
            .where('waitingList.roomId = :roomId', { roomId: String(roomId) })
            .andWhere('waitingList.position > :position', {
                position: removedPosition
            })
            .getMany()

        for (const user of usersToUpdate) {
            user.position = user.position - 1
            await this.waitingListRepository.save(user)
        }
    }

    async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
        this.logger.log(`📋 Getting participants for room ${roomId}`)

        const participants = await this.participantRepository.find({
            where: { roomId: roomId as string },
            relations: ['user'],
            order: { seatNumber: 'ASC' }
        })

        this.logger.log(
            `📋 Found ${participants.length} participants in room ${roomId}: [${participants.map((p) => `${p.user?.name || 'Unknown'}(${p.userId})`).join(', ')}]`
        )

        return participants
    }

    async getRoomWaitingList(roomId: string): Promise<
        Array<{
            id: string
            name: string
            email: string
            sitIndex: string
            image: string
        }>
    > {
        const waitingListEntries = await this.waitingListRepository
            .createQueryBuilder('waitingList')
            .leftJoinAndSelect('waitingList.user', 'user')
            .where('waitingList.roomId = :roomId', { roomId: String(roomId) })
            .orderBy('waitingList.position', 'ASC')
            .getMany()

        // Format the response to match the socket response format
        return waitingListEntries.map((entry) => ({
            id: entry.userId,
            name: entry.user?.name || 'Unknown User',
            email: entry.user?.email || '',
            sitIndex: entry.position?.toString() || '',
            image: entry.user?.avatarUrl || ''
        }))
    }

    async updateRoom(roomId: string, data: any): Promise<Room> {
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId }
        })

        if (!room) {
            throw new NotFoundException('Room not found')
        }

        // Remove password from update data if present
        const { password, ...updateData } = data

        // Validate maxSeats if it's being updated
        if (
            updateData.maxSeats !== undefined &&
            ![6, 8, 10].includes(updateData.maxSeats)
        ) {
            throw new BadRequestException('maxSeats must be either 6, 8, or 10')
        }

        Object.assign(room, updateData)
        return this.roomRepository.save(room)
    }

    async deleteRoom(roomId: string): Promise<void> {
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId }
        })

        if (!room) {
            throw new NotFoundException('Room not found')
        }

        room.isActive = false
        await this.roomRepository.save(room)

        // Remove all participants
        await this.participantRepository.delete({ roomId })

        // Clear waiting list
        await this.waitingListRepository.delete({ roomId })
    }

    async remove(roomId: string, userId: string): Promise<void> {
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId, ownerId: userId }
        })

        if (!room) {
            throw new ForbiddenException('You can only delete rooms you own')
        }

        room.isActive = false
        await this.roomRepository.save(room)
    }

    /**
     * Assign a role to a user in a room
     */
    async assignRoomRole(
        roomId: string,
        userId: string,
        role: RoomRole,
        assignedBy: string
    ): Promise<RoomRoleAssignment> {
        // Check if this role assignment already exists and is active
        const existingRole = await this.roomRoleRepository.findOne({
            where: { roomId, userId, role, isActive: true }
        })

        if (existingRole) {
            return existingRole
        }

        // For unique roles (owner, host, admin), ensure only one active assignment exists
        if ([RoomRole.OWNER, RoomRole.HOST, RoomRole.ADMIN].includes(role)) {
            await this.roomRoleRepository.update(
                { roomId, role, isActive: true },
                { isActive: false, revokedAt: new Date() }
            )
        }

        const roleAssignment = this.roomRoleRepository.create({
            roomId,
            userId,
            role,
            assignedBy,
            assignedAt: new Date(),
            isActive: true
        })

        return this.roomRoleRepository.save(roleAssignment)
    }

    /**
     * Get room details by group ID with roles and member information
     */
    async getRoomByGroupId(groupId: string): Promise<any> {
        // Find the room for this group
        const room = await this.roomRepository.findOne({
            where: { groupId, isActive: true },
            relations: [
                'owner',
                'group',
                'participants',
                'participants.user',
                'roleAssignments',
                'roleAssignments.user'
            ]
        })

        if (!room) {
            throw new NotFoundException('No active room found for this group')
        }

        return this.formatRoomDetails(room)
    }

    /**
     * Get room details by room ID with roles and member information
     */
    async getRoomDetails(roomId: string): Promise<any> {
        // Find the room by ID
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId, isActive: true },
            relations: [
                'owner',
                'group',
                'participants',
                'participants.user',
                'roleAssignments',
                'roleAssignments.user'
            ]
        })

        if (!room) {
            throw new NotFoundException('Room not found')
        }

        return this.formatRoomDetails(room)
    }

    /**
     * Helper method to format room details consistently
     */
    private async formatRoomDetails(room: Room): Promise<any> {
        // Get role assignments
        const roleAssignments = await this.roomRoleRepository.find({
            where: { roomId: room.uuid, isActive: true },
            relations: ['user']
        })

        // Find host and owner roles
        const hostRole = roleAssignments.find(
            (role) => role.role === RoomRole.HOST
        )
        const ownerRole = roleAssignments.find(
            (role) => role.role === RoomRole.OWNER
        )

        // Get owner information - prefer role assignment, fallback to room entity
        const ownerInfo = ownerRole?.user || room.owner
        const hostInfo = hostRole?.user || null

        // Get all participants with their roles
        const participants = await this.participantRepository.find({
            where: { roomId: room.uuid },
            relations: ['user'],
            order: { seatNumber: 'ASC' }
        })

        // Build participants list with the new format
        const hostUserId = hostInfo?.uuid
        const ownerId = room.ownerId

        // Determine if we should exclude a user from participants:
        // - Exclude if user is HOST (regardless of whether they're also owner)
        // - Include OWNER-ONLY users (who are not also hosts)
        const participantsList = participants
            .filter((participant) => {
                // Exclude if user is the host
                if (hostUserId && participant.userId === hostUserId) {
                    return false
                }
                // Include everyone else (including owner-only users)
                return true
            })
            .map((participant) => {
                const userRoles = roleAssignments.filter(
                    (role) => role.userId === participant.userId
                )

                // Determine role - convert to simple host/guest format
                let role = 'guest'
                if (
                    userRoles.some((r) =>
                        [RoomRole.OWNER, RoomRole.HOST].includes(r.role)
                    )
                ) {
                    role = 'host'
                } else if (userRoles.some((r) => r.role === RoomRole.ADMIN)) {
                    role = 'admin'
                } else if (userRoles.some((r) => r.role === RoomRole.SPEAKER)) {
                    role = 'speaker'
                }

                return {
                    userId: participant.user.uuid,
                    name: participant.user.name,
                    avatar: participant.user.avatarUrl || null,
                    seatIndex: participant.seatNumber - 1, // Convert to 0-based index
                    isSpeaking: participant.isSpeaking || false,
                    micOn: !participant.isMuted,
                    role: role
                }
            })

        // Build seats array with lock information - exclude host from seat occupancy
        const seats = await this.getRoomSeats(room.uuid, hostUserId)

        // Format response to match the new structure with both owner and host information
        return {
            roomId: room.uuid,
            roomName: room.name,
            description: room.description || null,
            level: (room as any).level ?? 0,
            // Owner information
            ownerId: ownerInfo.uuid,
            ownerName: ownerInfo.name,
            ownerImage: ownerInfo.avatarUrl || null,
            // Host information (may be same as owner or different)
            hostId: hostInfo?.uuid || room.ownerId,
            hostName: hostInfo?.name || ownerInfo.name,
            hostImage: hostInfo?.avatarUrl || ownerInfo.avatarUrl || null,
            participants: participantsList,
            seats: seats,
            maxSeats: room.maxSeats,
            roomAvatarUrl: room.roomAvatarUrl || null,
            createdAt: room.createdAt
        }
    }

    /**
     * Transfer room ownership to another user
     */
    async transferRoomOwnership(
        roomId: string,
        newOwnerId: string,
        currentUserId: string
    ): Promise<void> {
        // Verify current user is the owner
        const currentOwnerRole = await this.roomRoleRepository.findOne({
            where: {
                roomId,
                userId: currentUserId,
                role: RoomRole.OWNER,
                isActive: true
            }
        })

        if (!currentOwnerRole) {
            throw new ForbiddenException(
                'Only the room owner can transfer ownership'
            )
        }

        // Revoke current ownership
        await this.roomRoleRepository.update(
            { roomId, role: RoomRole.OWNER, isActive: true },
            { isActive: false, revokedAt: new Date() }
        )

        // Assign new ownership
        await this.assignRoomRole(
            roomId,
            newOwnerId,
            RoomRole.OWNER,
            currentUserId
        )

        // Update room owner in the room entity
        await this.roomRepository.update(
            { uuid: roomId },
            { ownerId: newOwnerId }
        )
    }

    /**
     * Get user roles in a room
     */
    async getUserRolesInRoom(
        roomId: string,
        userId: string
    ): Promise<RoomRole[]> {
        const roles = await this.roomRoleRepository.find({
            where: { roomId, userId, isActive: true }
        })

        return roles.map((role) => role.role)
    }

    /**
     * Remove a role from a user
     */
    async removeRoomRole(
        roomId: string,
        userId: string,
        role: RoomRole,
        removedBy: string
    ): Promise<void> {
        await this.roomRoleRepository.update(
            { roomId, userId, role, isActive: true },
            { isActive: false, revokedAt: new Date() }
        )
    }

    /**
     * Add a comment to a room
     */
    async addRoomComment(
        roomId: string,
        userId: string,
        message: string,
        messageType: 'text' | 'emoji' | 'sticker' | 'system' = 'text',
        replyToId?: string,
        metadata?: any,
        allowObservers: boolean = true // New parameter to allow observers to comment
    ): Promise<RoomComment> {
        // First verify the room exists and user has access
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId, isActive: true }
        })

        if (!room) {
            throw new NotFoundException('Room not found')
        }

        // Check if user is a participant (seated)
        const participant = await this.participantRepository.findOne({
            where: { roomId, userId }
        })

        // If not a participant and observers are not allowed, throw error
        if (!participant && !allowObservers) {
            throw new ForbiddenException(
                'You must be a participant in the room to comment'
            )
        }

        // If not a participant but observers are allowed, verify user exists
        if (!participant && allowObservers) {
            const user = await this.userRepository.findOne({
                where: { uuid: userId }
            })

            if (!user) {
                throw new ForbiddenException('User not found or invalid')
            }
        }

        // If replying to a comment, verify it exists
        if (replyToId) {
            const replyToComment = await this.roomCommentRepository.findOne({
                where: { uuid: replyToId, roomId }
            })

            if (!replyToComment) {
                throw new NotFoundException('Comment to reply to not found')
            }
        }

        const comment = this.roomCommentRepository.create({
            roomId,
            userId,
            message,
            messageType,
            replyToId,
            metadata
        })

        const savedComment = await this.roomCommentRepository.save(comment)

        // Return comment with user information
        return await this.roomCommentRepository.findOne({
            where: { uuid: savedComment.uuid },
            relations: ['user']
        })
    }

    /**
     * Get room comments with enhanced information
     */
    async getRoomComments(
        roomId: string,
        limit?: number,
        offset?: number
    ): Promise<any[]> {
        const queryBuilder = this.roomCommentRepository
            .createQueryBuilder('comment')
            .leftJoinAndSelect('comment.user', 'user')
            .leftJoinAndSelect('comment.replyTo', 'replyTo')
            .leftJoinAndSelect('replyTo.user', 'replyToUser')
            .where('comment.roomId = :roomId', { roomId })
            .andWhere('comment.isVisible = :isVisible', { isVisible: true })
            .orderBy('comment.createdAt', 'DESC')
            .select([
                'comment.uuid',
                'comment.userId',
                'comment.message',
                'comment.messageType',
                'comment.metadata',
                'comment.reactions',
                'comment.replyToId',
                'comment.createdAt',
                'user.uuid',
                'user.name',
                'user.avatarUrl',
                'replyTo.uuid',
                'replyTo.message',
                'replyTo.messageType',
                'replyToUser.uuid',
                'replyToUser.name'
            ])

        if (limit) {
            queryBuilder.limit(limit)
        }
        if (offset) {
            queryBuilder.offset(offset)
        }

        const comments = await queryBuilder.getMany()

        return comments.map((comment) => ({
            _id: comment.uuid,
            senderId: comment.user.uuid,
            senderName: comment.user.name,
            senderImage: comment.user.avatarUrl || null,
            content: comment.message,
            messageType: comment.messageType,
            metadata: comment.metadata,
            reactions: comment.reactions || {},
            replyTo: comment.replyTo
                ? {
                      _id: comment.replyTo.uuid,
                      senderId: comment.replyTo.user?.uuid,
                      senderName: comment.replyTo.user?.name,
                      content: comment.replyTo.message,
                      messageType: comment.replyTo.messageType
                  }
                : null,
            createdAt: comment.createdAt,
            isVisible: true
        }))
    }

    /**
     * Delete a room comment (only by the author or room moderators)
     */
    async deleteRoomComment(
        commentId: string,
        userId: string
    ): Promise<boolean> {
        try {
            const comment = await this.roomCommentRepository.findOne({
                where: { uuid: commentId, userId }
            })

            if (!comment) {
                this.logger.warn(
                    `Comment not found or unauthorized deletion attempt: ${commentId} by user ${userId}`
                )
                return false
            }

            await this.roomCommentRepository.remove(comment)
            this.logger.log(
                `Comment deleted successfully: ${commentId} by user ${userId}`
            )
            return true
        } catch (error) {
            this.logger.error(
                `Error deleting room comment: ${error.message}`,
                error.stack
            )
            return false
        }
    }

    async isUserInRoom(userId: string, roomId: string): Promise<boolean> {
        try {
            const participant = await this.participantRepository.findOne({
                where: { userId, roomId }
            })
            return !!participant
        } catch (error) {
            this.logger.error(
                `Error checking if user is in room: ${error.message}`,
                error.stack
            )
            return false
        }
    }

    async handleCommentReaction(
        roomId: string,
        commentId: string,
        userId: string,
        reaction: string,
        action: 'add' | 'remove'
    ): Promise<{
        success: boolean
        comment?: RoomComment
        error?: string
    }> {
        try {
            // Find the comment
            const comment = await this.roomCommentRepository.findOne({
                where: { uuid: commentId, roomId },
                relations: ['user']
            })

            if (!comment) {
                return {
                    success: false,
                    error: 'Comment not found'
                }
            }

            // Initialize reactions if null
            if (!comment.reactions) {
                comment.reactions = {}
            }

            // Handle reaction action
            if (action === 'add') {
                if (!comment.reactions[reaction]) {
                    comment.reactions[reaction] = []
                }

                // Add user to reaction if not already present
                if (!comment.reactions[reaction].includes(userId)) {
                    comment.reactions[reaction].push(userId)
                }
            } else {
                // Remove user from reaction
                if (comment.reactions[reaction]) {
                    comment.reactions[reaction] = comment.reactions[
                        reaction
                    ].filter((id) => id !== userId)

                    // Remove reaction type if no users left
                    if (comment.reactions[reaction].length === 0) {
                        delete comment.reactions[reaction]
                    }
                }
            }

            // Save the updated comment
            await this.roomCommentRepository.save(comment)

            // Reload with relations for return
            const updatedComment = await this.roomCommentRepository.findOne({
                where: { uuid: commentId },
                relations: ['user', 'replyTo', 'replyTo.user']
            })

            return {
                success: true,
                comment: updatedComment
            }
        } catch (error) {
            this.logger.error(
                `Error handling comment reaction: ${error.message}`,
                error.stack
            )
            return {
                success: false,
                error: 'Failed to update comment reaction'
            }
        }
    }

    /**
     * Upload room avatar image
     */
    async uploadRoomAvatar(
        roomId: string,
        file: Express.Multer.File,
        currentUserId: string
    ): Promise<{ roomAvatarUrl: string }> {
        // Validate file type and size - Support for all common image formats
        const allowedMimeTypes = [
            // JPEG formats
            'image/jpeg',
            'image/jpg',
            'image/pjpeg', // Progressive JPEG

            // PNG formats
            'image/png',
            'image/x-png',

            // GIF formats
            'image/gif',

            // WebP formats
            'image/webp',

            // BMP formats
            'image/bmp',
            'image/x-bmp',
            'image/x-bitmap',
            'image/x-win-bitmap',
            'image/x-windows-bmp',
            'image/ms-bmp',

            // TIFF formats
            'image/tiff',
            'image/tif',
            'image/x-tiff',

            // SVG formats
            'image/svg+xml',
            'image/svg',

            // Modern formats
            'image/avif',
            'image/heic',
            'image/heif',

            // Icon formats
            'image/x-icon',
            'image/vnd.microsoft.icon',
            'image/ico',

            // Additional formats
            'image/jfif',
            'image/pjp',
            'image/jpg2',
            'image/jp2'
        ]

        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                'Invalid file type. Please upload a valid image file (JPEG/JPG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO, JFIF)'
            )
        }

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024 // 10MB in bytes
        if (file.size > maxSize) {
            throw new BadRequestException(
                'File size too large. Maximum size allowed is 10MB'
            )
        }

        // Find the room and verify ownership/permissions
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId, isActive: true }
        })

        if (!room) {
            throw new NotFoundException('Room not found')
        }

        // Check if user has permission to update room (owner or admin)
        const userRoles = await this.getUserRolesInRoom(roomId, currentUserId)
        const canUpdate =
            room.ownerId === currentUserId ||
            userRoles.includes(RoomRole.OWNER) ||
            userRoles.includes(RoomRole.HOST) ||
            userRoles.includes(RoomRole.ADMIN)

        if (!canUpdate) {
            throw new ForbiddenException(
                'You do not have permission to update this room avatar'
            )
        }

        try {
            // Upload to Cloudinary
            const uploadResult = await this.cloudinaryService.uploadImage(
                file,
                {
                    folder: 'kitty/rooms/avatars',
                    public_id: `room-${roomId}-${Date.now()}`,
                    transformation: {
                        width: 400,
                        height: 400,
                        crop: 'fill',
                        gravity: 'face',
                        quality: 'auto'
                    }
                }
            )

            // Update room with new avatar URL
            await this.roomRepository.update(
                { uuid: roomId },
                { roomAvatarUrl: uploadResult.secure_url }
            )

            return { roomAvatarUrl: uploadResult.secure_url }
        } catch (error) {
            console.error('Room avatar upload error:', error)
            throw new BadRequestException(
                `Failed to upload room avatar: ${error.message}`
            )
        }
    }

    /**
     * Get recommended rooms (all active rooms with their details)
     */
    async getRecommendedRooms(userId?: string): Promise<any[]> {
        const rooms = await this.roomRepository.find({
            where: { isActive: true },
            relations: ['owner', 'group', 'participants', 'participants.user'],
            order: { createdAt: 'DESC' }
        })

        const recommendedRooms = []

        for (const room of rooms) {
            // Format room details directly instead of calling getRoomByGroupId
            // to avoid duplicates when multiple rooms have the same groupId
            const roomDetails = await this.formatRoomDetails(room)

            // Add roomAvatarUrl to the response
            if (roomDetails) {
                roomDetails.roomAvatarUrl = room.roomAvatarUrl || null
                recommendedRooms.push(roomDetails)
            }
        }

        // Filter out blocked rooms for the specific user
        if (userId) {
            return await this.filterRoomsForUser(recommendedRooms, userId)
        }

        return recommendedRooms
    }

    /**
     * Track user room activity for popularity calculations
     */
    async trackRoomActivity(roomId: string, userId: string): Promise<void> {
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0) // Set to start of day

            // Check if there's already an entry for today
            const existingActivity =
                await this.roomActivityTrackingRepository.findOne({
                    where: {
                        roomId,
                        userId,
                        activityDate: today
                    }
                })

            if (existingActivity) {
                // Increment visit count and update last visit time
                existingActivity.visitCount += 1
                existingActivity.lastVisitTime = new Date()
                await this.roomActivityTrackingRepository.save(existingActivity)
            } else {
                // Create new activity record
                const newActivity = this.roomActivityTrackingRepository.create({
                    roomId,
                    userId,
                    activityDate: today,
                    visitCount: 1,
                    lastVisitTime: new Date()
                })
                await this.roomActivityTrackingRepository.save(newActivity)
            }
        } catch (error) {
            this.logger.error(`Failed to track room activity: ${error.message}`)
            // Don't throw error to avoid disrupting the main flow
        }
    }

    /**
     * Get popular rooms based on activity tracking
     */
    async getPopularRooms(): Promise<any[]> {
        try {
            // Get room popularity scores based on recent activity (last 30 days)
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const popularityQuery = `
                SELECT
                    r.uuid as room_id,
                    r.name,
                    r.description,
                    r.level,
                    r."roomAvatarUrl",
                    r."maxSeats",
                    r."createdAt",
                    r."updatedAt",
                    r."ownerId",
                    r."groupId",
                    COALESCE(activity_stats.total_visits, 0) as total_visits,
                    COALESCE(activity_stats.unique_visitors, 0) as unique_visitors,
                    COALESCE(activity_stats.recent_activity_score, 0) as popularity_score
                FROM rooms r
                LEFT JOIN (
                    SELECT
                        rat."roomId",
                        SUM(rat."visitCount") as total_visits,
                        COUNT(DISTINCT rat."userId") as unique_visitors,
                        -- Calculate popularity score: recent visits have higher weight
                        SUM(
                            rat."visitCount" *
                            CASE
                                WHEN rat."activityDate" >= CURRENT_DATE - INTERVAL '7 days' THEN 3.0
                                WHEN rat."activityDate" >= CURRENT_DATE - INTERVAL '14 days' THEN 2.0
                                WHEN rat."activityDate" >= CURRENT_DATE - INTERVAL '30 days' THEN 1.0
                                ELSE 0.5
                            END
                        ) as recent_activity_score
                    FROM room_activity_tracking rat
                    WHERE rat."activityDate" >= $1
                    GROUP BY rat."roomId"
                ) activity_stats ON r.uuid = activity_stats."roomId"
                WHERE r."isActive" = true
                ORDER BY popularity_score DESC, r."createdAt" DESC
            `

            const roomsWithPopularity = await this.roomRepository.query(
                popularityQuery,
                [thirtyDaysAgo]
            )

            // Get all active rooms in case some don't have activity tracking yet
            const allActiveRooms = await this.roomRepository.find({
                where: { isActive: true },
                relations: [
                    'owner',
                    'group',
                    'participants',
                    'participants.user'
                ],
                order: { createdAt: 'DESC' }
            })

            // Create a map of room popularity scores
            const popularityMap = new Map()
            roomsWithPopularity.forEach((room) => {
                popularityMap.set(room.room_id, {
                    totalVisits: parseInt(room.total_visits) || 0,
                    uniqueVisitors: parseInt(room.unique_visitors) || 0,
                    popularityScore: parseFloat(room.popularity_score) || 0
                })
            })

            // Format room details with popularity info
            const popularRooms = []
            for (const room of allActiveRooms) {
                const roomDetails = await this.formatRoomDetails(room)
                if (roomDetails) {
                    const popularityInfo = popularityMap.get(room.uuid) || {
                        totalVisits: 0,
                        uniqueVisitors: 0,
                        popularityScore: 0
                    }

                    roomDetails.roomAvatarUrl = room.roomAvatarUrl || null
                    roomDetails.popularity = popularityInfo

                    popularRooms.push(roomDetails)
                }
            }

            // Sort by popularity score, then by creation date
            popularRooms.sort((a, b) => {
                if (
                    b.popularity.popularityScore !==
                    a.popularity.popularityScore
                ) {
                    return (
                        b.popularity.popularityScore -
                        a.popularity.popularityScore
                    )
                }
                return (
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
            })

            // Add some randomization to prevent rooms from being stuck in positions
            // Group rooms by popularity tiers and shuffle within tiers
            const tiers = {
                hot: [], // Top 20% by popularity score > 10
                trending: [], // Next 30% by popularity score > 5
                popular: [], // Next 30% by popularity score > 1
                regular: [] // Remaining rooms
            }

            popularRooms.forEach((room) => {
                const score = room.popularity.popularityScore
                if (score > 10) {
                    tiers.hot.push(room)
                } else if (score > 5) {
                    tiers.trending.push(room)
                } else if (score > 1) {
                    tiers.popular.push(room)
                } else {
                    tiers.regular.push(room)
                }
            })

            // Shuffle within each tier to add variety
            Object.values(tiers).forEach((tier) => {
                for (let i = tier.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1))
                    ;[tier[i], tier[j]] = [tier[j], tier[i]]
                }
            })

            // Combine tiers back together
            const shuffledRooms = [
                ...tiers.hot,
                ...tiers.trending,
                ...tiers.popular,
                ...tiers.regular
            ]

            return shuffledRooms
        } catch (error) {
            this.logger.error(`Failed to get popular rooms: ${error.message}`)
            // Fallback to recommended rooms logic
            return await this.getRecommendedRooms()
        }
    }

    // ==================== SEAT MANAGEMENT METHODS ====================

    /**
     * Initialize seat records for a room (seat 0 is host/admin seat)
     */
    async initializeRoomSeats(roomId: string, maxSeats: number): Promise<void> {
        const seats = []

        // Add seats (0 to maxSeats-1)
        // Seat 0 is the host/admin seat (reserved for room owner)
        for (let i = 0; i < maxSeats; i++) {
            seats.push(
                this.roomSeatRepository.create({
                    roomId,
                    seatIndex: i,
                    isLocked: false,
                    isAdminSeat: i === 0, // Seat 0 is the admin/host seat
                    metadata: { seatType: i === 0 ? 'admin' : 'regular' }
                })
            )
        }
        await this.roomSeatRepository.save(seats)
    }

    /**
     * Validate and assign a specific seat to a user (with admin seat support)
     */
    async validateAndAssignSeat(
        roomId: string,
        seatIndex: number,
        userId: string
    ): Promise<number> {
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId }
        })

        if (!room) {
            throw new NotFoundException('Room not found')
        }

        // Validate seat index is within bounds
        if (seatIndex < 0 || seatIndex >= room.maxSeats) {
            throw new BadRequestException(
                `Seat index must be between 0 and ${room.maxSeats - 1}`
            )
        }

        // Special handling for seat 0 (host/admin seat)
        if (seatIndex === 0) {
            // Only the room owner can sit in seat 0
            if (room.ownerId !== userId) {
                throw new ForbiddenException(
                    'Only the room owner can sit in seat 0 (host seat)'
                )
            }

            // Check if seat 0 is already occupied
            const existingSeat = await this.participantRepository.findOne({
                where: { roomId, seatNumber: 1 } // seatNumber is 1-based (seatIndex 0 = seatNumber 1)
            })

            if (existingSeat && existingSeat.userId !== userId) {
                throw new BadRequestException(
                    'Seat 0 (host seat) is already occupied'
                )
            }

            return seatIndex
        }

        // Check if seat is locked
        const seatInfo = await this.roomSeatRepository.findOne({
            where: { roomId, seatIndex }
        })

        if (seatInfo?.isLocked) {
            throw new BadRequestException(
                `Seat ${seatIndex} is currently locked`
            )
        }

        // Check if seat is already occupied
        const existingParticipant = await this.participantRepository.findOne({
            where: { roomId, seatNumber: seatIndex + 1 } // Convert to 1-based for DB
        })

        if (existingParticipant) {
            throw new ConflictException(`Seat ${seatIndex} is already occupied`)
        }

        return seatIndex
    }

    /**
     * Find next available seat for a user (auto-assignment)
     */
    async findNextAvailableSeat(
        roomId: string,
        userId: string
    ): Promise<number> {
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId },
            relations: ['participants']
        })

        if (!room) {
            throw new NotFoundException('Room not found')
        }

        // Get locked seats
        const lockedSeats = await this.roomSeatRepository.find({
            where: { roomId, isLocked: true }
        })
        const lockedSeatIndexes = lockedSeats.map((seat) => seat.seatIndex)

        // Get occupied seats
        const occupiedSeats = room.participants.map((p) => p.seatNumber - 1) // Convert to 0-based

        // Find first available seat starting from index 0
        for (let i = 0; i < room.maxSeats; i++) {
            if (!lockedSeatIndexes.includes(i) && !occupiedSeats.includes(i)) {
                return i
            }
        }

        throw new BadRequestException('No available seats in the room')
    }

    /**
     * Toggle seat lock status (only host/owner can lock seats)
     */
    async toggleSeatLock(
        roomId: string,
        seatIndex: number,
        isLocked: boolean,
        userId: string
    ): Promise<{ success: boolean; seat: RoomSeat }> {
        this.logger.log(
            `🔒 Toggling seat lock: Room ${roomId}, Seat ${seatIndex}, Lock: ${isLocked}, User: ${userId}`
        )

        const room = await this.roomRepository.findOne({
            where: { uuid: roomId }
        })

        if (!room) {
            throw new NotFoundException('Room not found')
        }

        // Validate bounds
        if (seatIndex < 0 || seatIndex >= room.maxSeats) {
            throw new BadRequestException(
                `Seat index must be between 0 and ${room.maxSeats - 1}`
            )
        }

        // Permission: owner or host can lock/unlock
        const roles = await this.getUserRolesInRoom(roomId, userId)
        const isOwner =
            room.ownerId === userId || roles.includes(RoomRole.OWNER)
        const isHost = roles.includes(RoomRole.HOST)
        if (!isOwner && !isHost) {
            throw new ForbiddenException(
                'Only room owner/host can lock/unlock seats'
            )
        }

        // Load or create seat metadata
        let seat = await this.roomSeatRepository.findOne({
            where: { roomId, seatIndex }
        })
        if (!seat) {
            seat = this.roomSeatRepository.create({
                roomId,
                seatIndex,
                isLocked: false
            })
        }

        // If locking an occupied seat, remove occupant first
        if (isLocked) {
            const occupant = await this.participantRepository.findOne({
                where: { roomId, seatNumber: seatIndex + 1 }
            })
            if (occupant) {
                this.logger.log(
                    `🔒 Seat ${seatIndex} is occupied by ${occupant.userId}. Removing occupant before locking.`
                )
                await this.participantRepository.remove(occupant)
                await this.promoteFromWaitingList(roomId)
                this.logger.log(
                    `✅ Removed user ${occupant.userId} from seat ${seatIndex} before locking`
                )
            }
        }

        // Update lock metadata
        seat.isLocked = isLocked
        seat.lockedBy = isLocked ? userId : null
        seat.lockedAt = isLocked ? new Date() : null

        const updatedSeat = await this.roomSeatRepository.save(seat)

        this.logger.log(
            `✅ Seat ${seatIndex} ${isLocked ? 'locked' : 'unlocked'} successfully`
        )

        return { success: true, seat: updatedSeat }
    }

    /**
     * Get current seat state for a room (including admin seat)
     */
    async getRoomSeats(roomId: string, hostUserId?: string): Promise<any[]> {
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId },
            relations: ['participants', 'participants.user']
        })

        if (!room) {
            throw new NotFoundException('Room not found')
        }

        // Get seat lock information
        const seatLocks = await this.roomSeatRepository.find({
            where: { roomId }
        })

        const seats = []

        // Add all seats (0 to maxSeats-1)
        // Seat 0 is the host/admin seat
        for (let i = 0; i < room.maxSeats; i++) {
            const seatLock = seatLocks.find((lock) => lock.seatIndex === i)
            // Find participant whose stored seatNumber matches this index (1-based in DB)
            let participant =
                room.participants.find((p) => p.seatNumber === i + 1) || null

            // If hostUserId is provided and this participant is the host, don't show them as occupying the seat
            if (
                participant &&
                hostUserId &&
                participant.userId === hostUserId
            ) {
                participant = null
            }

            seats.push({
                index: i,
                locked: seatLock?.isLocked || false,
                occupied: !!participant,
                occupantUserId:
                    participant?.user?.uuid || participant?.userId || null,
                isAdminSeat: i === 0, // Seat 0 is the host/admin seat
                metadata: { seatType: i === 0 ? 'admin' : 'regular' }
            })
        }

        return seats
    }

    // NOTE: requestAdminSeat and approveAdminSeatRequest methods removed
    // Seat 0 is now reserved exclusively for the room owner (no seat swapping needed)

    // ==================== BLOCKED USERS MANAGEMENT ====================

    /**
     * Block a user from a specific room
     */
    async blockUserFromRoom(
        roomId: string,
        userIdToBlock: string,
        blockedBy: string,
        reason?: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            this.logger.log(
                `🚫 BLOCK_USER: User ${blockedBy} attempting to block user ${userIdToBlock} from room ${roomId}`
            )

            // Verify the room exists
            const room = await this.roomRepository.findOne({
                where: { uuid: roomId, isActive: true }
            })

            if (!room) {
                throw new Error('Room not found')
            }

            // Verify the user doing the blocking has permission (host/owner)
            const roomDetails = await this.getRoomDetails(roomId)
            const blockerRoles = await this.getUserRolesInRoom(
                roomId,
                blockedBy
            )
            const isHost =
                roomDetails?.hostId === blockedBy ||
                blockerRoles.includes(RoomRole.OWNER) ||
                blockerRoles.includes(RoomRole.HOST)

            if (!isHost) {
                throw new Error('Only room host or owner can block users')
            }

            // Verify the user to block exists
            const userToBlock = await this.userRepository.findOne({
                where: { uuid: userIdToBlock, isActive: true }
            })

            if (!userToBlock) {
                throw new Error('User to block not found')
            }

            // Check if user is already blocked
            const existingBlock = await this.roomBlockedUserRepository.findOne({
                where: {
                    roomId: roomId,
                    userId: userIdToBlock,
                    isActive: true
                }
            })

            if (existingBlock) {
                return {
                    success: false,
                    message: 'User is already blocked from this room'
                }
            }

            // Remove user from room if they are currently a participant
            const participant = await this.participantRepository.findOne({
                where: {
                    roomId: roomId,
                    userId: userIdToBlock
                }
            })

            if (participant) {
                await this.participantRepository.remove(participant)
                this.logger.log(
                    `🚪 BLOCK_USER: Removed user ${userIdToBlock} from room ${roomId} participants`
                )
            }

            // Remove user from waiting list if they are there
            const waitingListEntry = await this.waitingListRepository.findOne({
                where: {
                    roomId: roomId,
                    userId: userIdToBlock
                }
            })

            if (waitingListEntry) {
                await this.waitingListRepository.remove(waitingListEntry)
                this.logger.log(
                    `📝 BLOCK_USER: Removed user ${userIdToBlock} from room ${roomId} waiting list`
                )
            }

            // Create the block record
            const blockRecord = this.roomBlockedUserRepository.create({
                roomId: roomId,
                userId: userIdToBlock,
                blockedBy: blockedBy,
                reason: reason || 'No reason provided',
                isActive: true,
                blockedAt: new Date()
            })

            await this.roomBlockedUserRepository.save(blockRecord)

            this.logger.log(
                `✅ BLOCK_USER success: User ${userIdToBlock} has been blocked from room ${roomId} by ${blockedBy}`
            )

            return {
                success: true,
                message: 'User has been successfully blocked from the room'
            }
        } catch (error) {
            this.logger.error(
                `❌ BLOCK_USER failed: Error blocking user ${userIdToBlock} from room ${roomId} | Error: ${error.message}`,
                error.stack
            )
            return {
                success: false,
                message: error.message
            }
        }
    }

    /**
     * Unblock a user from a specific room
     */
    async unblockUserFromRoom(
        roomId: string,
        userIdToUnblock: string,
        unblockedBy: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            this.logger.log(
                `✅ UNBLOCK_USER: User ${unblockedBy} attempting to unblock user ${userIdToUnblock} from room ${roomId}`
            )

            // Verify the room exists
            const room = await this.roomRepository.findOne({
                where: { uuid: roomId, isActive: true }
            })

            if (!room) {
                throw new Error('Room not found')
            }

            // Verify the user doing the unblocking has permission (host/owner)
            const roomDetails = await this.getRoomDetails(roomId)
            const unblockerRoles = await this.getUserRolesInRoom(
                roomId,
                unblockedBy
            )
            const isHost =
                roomDetails?.hostId === unblockedBy ||
                unblockerRoles.includes(RoomRole.OWNER) ||
                unblockerRoles.includes(RoomRole.HOST)

            if (!isHost) {
                throw new Error('Only room host or owner can unblock users')
            }

            // Find and deactivate the block record
            const blockRecord = await this.roomBlockedUserRepository.findOne({
                where: {
                    roomId: roomId,
                    userId: userIdToUnblock,
                    isActive: true
                }
            })

            if (!blockRecord) {
                return {
                    success: false,
                    message: 'User is not currently blocked from this room'
                }
            }

            blockRecord.isActive = false
            await this.roomBlockedUserRepository.save(blockRecord)

            this.logger.log(
                `✅ UNBLOCK_USER success: User ${userIdToUnblock} has been unblocked from room ${roomId} by ${unblockedBy}`
            )

            return {
                success: true,
                message: 'User has been successfully unblocked from the room'
            }
        } catch (error) {
            this.logger.error(
                `❌ UNBLOCK_USER failed: Error unblocking user ${userIdToUnblock} from room ${roomId} | Error: ${error.message}`,
                error.stack
            )
            return {
                success: false,
                message: error.message
            }
        }
    }

    /**
     * Check if a user is blocked from a specific room
     */
    async isUserBlockedFromRoom(
        roomId: string,
        userId: string
    ): Promise<boolean> {
        const blockRecord = await this.roomBlockedUserRepository.findOne({
            where: {
                roomId: roomId,
                userId: userId,
                isActive: true
            }
        })

        return !!blockRecord
    }

    /**
     * Get blocked users for a room
     */
    async getRoomBlockedUsers(roomId: string): Promise<any[]> {
        const blockedUsers = await this.roomBlockedUserRepository.find({
            where: {
                roomId: roomId,
                isActive: true
            },
            relations: ['user', 'blockedByUser'],
            order: { blockedAt: 'DESC' }
        })

        return blockedUsers.map((block) => ({
            userId: block.userId,
            userName: block.user?.name || block.user?.email || 'Unknown User',
            userAvatar: block.user?.avatarUrl || null,
            blockedBy: block.blockedBy,
            blockedByName:
                block.blockedByUser?.name ||
                block.blockedByUser?.email ||
                'Unknown User',
            reason: block.reason,
            blockedAt: block.blockedAt
        }))
    }

    /**
     * Filter rooms for a user (exclude blocked rooms)
     */
    async filterRoomsForUser(rooms: any[], userId?: string): Promise<any[]> {
        if (!userId) {
            return rooms
        }

        const blockedRoomIds = await this.roomBlockedUserRepository.find({
            where: {
                userId: userId,
                isActive: true
            },
            select: ['roomId']
        })

        const blockedRoomIdSet = new Set(
            blockedRoomIds.map((block) => block.roomId)
        )

        return rooms.filter(
            (room) => !blockedRoomIdSet.has(room.roomId || room.uuid)
        )
    }

    // ==================== PK BATTLE MANAGEMENT METHODS ====================

    /**
     * Create a new PK Battle
     */
    async createPKBattle(
        roomId: string,
        hostId: string,
        participantIds: string[],
        durationMinutes: number,
        battleType: PKBattleType = PKBattleType.HOST_SELECTED,
        description?: string,
        metadata?: any
    ): Promise<PKBattle> {
        // Validate room exists and host has permission
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId, isActive: true }
        })

        if (!room) {
            throw new NotFoundException(`Room with ID ${roomId} not found`)
        }

        // Check if user is host/owner/admin
        const hostRoles = await this.getUserRolesInRoom(roomId, hostId)
        const canCreateBattle =
            hostRoles.includes(RoomRole.HOST) ||
            hostRoles.includes(RoomRole.OWNER) ||
            hostRoles.includes(RoomRole.ADMIN) ||
            room.ownerId === hostId

        if (!canCreateBattle) {
            throw new ForbiddenException(
                'Only hosts, owners, or admins can create PK battles'
            )
        }

        // Validate participants
        if (participantIds.length !== 2) {
            throw new BadRequestException(
                'Exactly 2 participants are required for a PK battle'
            )
        }

        // With the new seat management system, we allow:
        // 1. Users who are seated in the room (participants)
        // 2. The host (who can also be seated now)
        for (const participantId of participantIds) {
            // Check if user is seated in the room OR is the host
            const isInRoom = await this.isUserInRoom(participantId, roomId)
            const userRoles = await this.getUserRolesInRoom(
                roomId,
                participantId
            )
            const isHost =
                userRoles.includes(RoomRole.HOST) ||
                userRoles.includes(RoomRole.OWNER)

            if (!isInRoom && !isHost) {
                const user = await this.userRepository.findOne({
                    where: { uuid: participantId }
                })
                throw new BadRequestException(
                    `User ${user?.name || participantId} must be seated in the room or be the host to participate in PK battle`
                )
            }
        }

        // Check if there's already an active battle in this room
        const existingBattle = await this.pkBattleRepository.findOne({
            where: {
                roomId,
                status: PKBattleStatus.ACTIVE,
                isActive: true
            }
        })

        if (existingBattle) {
            // Check if the existing battle has expired
            const now = new Date()
            if (existingBattle.endTime && now > existingBattle.endTime) {
                // Automatically end the expired battle
                await this.endPKBattle(existingBattle.uuid)
            } else {
                // There's still an active, non-expired battle
                throw new ConflictException(
                    'There is already an active PK battle in this room'
                )
            }
        }

        // Create the battle
        const now = new Date()
        const battle = this.pkBattleRepository.create({
            roomId,
            hostId,
            battleType,
            duration: durationMinutes * 60, // Convert to seconds
            status:
                battleType === PKBattleType.HOST_SELECTED
                    ? PKBattleStatus.ACTIVE
                    : PKBattleStatus.PENDING,
            description,
            metadata,
            // If HOST_SELECTED, start immediately
            startTime:
                battleType === PKBattleType.HOST_SELECTED ? now : undefined,
            endTime:
                battleType === PKBattleType.HOST_SELECTED
                    ? new Date(now.getTime() + durationMinutes * 60 * 1000)
                    : undefined
        })

        const savedBattle = await this.pkBattleRepository.save(battle)

        // Create battle participants
        for (let i = 0; i < participantIds.length; i++) {
            const participant = this.pkBattleParticipantRepository.create({
                battleId: savedBattle.uuid,
                userId: participantIds[i],
                position: i + 1,
                // If HOST_SELECTED, participants are automatically active
                status:
                    battleType === PKBattleType.HOST_SELECTED
                        ? PKBattleParticipantStatus.ACTIVE
                        : PKBattleParticipantStatus.INVITED,
                // Set joinedAt for HOST_SELECTED battles
                joinedAt:
                    battleType === PKBattleType.HOST_SELECTED ? now : undefined
            })
            await this.pkBattleParticipantRepository.save(participant)
        }

        // If HOST_SELECTED, schedule automatic battle end
        if (battleType === PKBattleType.HOST_SELECTED) {
            setTimeout(
                async () => {
                    try {
                        await this.endPKBattle(savedBattle.uuid)
                    } catch (error) {
                        this.logger.error(
                            `Failed to auto-end PK battle ${savedBattle.uuid}: ${error.message}`
                        )
                    }
                },
                durationMinutes * 60 * 1000
            )

            this.logger.log(
                `🚀 HOST_SELECTED PK Battle ${savedBattle.uuid} started immediately and will auto-end in ${durationMinutes} minutes`
            )
        }

        // Load the complete battle with participants
        return await this.pkBattleRepository.findOne({
            where: { uuid: savedBattle.uuid },
            relations: ['participants', 'participants.user', 'host', 'room']
        })
    }

    /**
     * Approve or reject a PK Battle
     */
    async approvePKBattle(
        battleId: string,
        hostId: string,
        approved: boolean,
        reason?: string
    ): Promise<PKBattle> {
        const battle = await this.pkBattleRepository.findOne({
            where: { uuid: battleId, isActive: true },
            relations: ['participants', 'participants.user', 'host']
        })

        if (!battle) {
            throw new NotFoundException(
                `PK Battle with ID ${battleId} not found`
            )
        }

        if (battle.hostId !== hostId) {
            throw new ForbiddenException(
                'Only the battle host can approve or reject battles'
            )
        }

        if (battle.status !== PKBattleStatus.PENDING) {
            throw new BadRequestException('Battle is not in pending status')
        }

        if (approved) {
            battle.status = PKBattleStatus.APPROVED
        } else {
            battle.status = PKBattleStatus.CANCELLED
            battle.metadata = {
                ...battle.metadata,
                rejectionReason: reason,
                rejectedAt: new Date()
            }
        }

        return await this.pkBattleRepository.save(battle)
    }

    /**
     * Start a PK Battle
     */
    async startPKBattle(battleId: string, hostId: string): Promise<PKBattle> {
        const battle = await this.pkBattleRepository.findOne({
            where: { uuid: battleId, isActive: true },
            relations: ['participants', 'participants.user']
        })

        if (!battle) {
            throw new NotFoundException(
                `PK Battle with ID ${battleId} not found`
            )
        }

        if (battle.hostId !== hostId) {
            throw new ForbiddenException(
                'Only the battle host can start battles'
            )
        }

        // HOST_SELECTED battles are already active, no need to start
        if (battle.battleType === PKBattleType.HOST_SELECTED) {
            if (battle.status === PKBattleStatus.ACTIVE) {
                return battle // Already active, return as is
            } else {
                throw new BadRequestException(
                    'HOST_SELECTED battles start automatically and cannot be manually started'
                )
            }
        }

        // For other battle types, require approval first
        if (battle.status !== PKBattleStatus.APPROVED) {
            throw new BadRequestException(
                'Battle must be approved before starting'
            )
        }

        // Check if all participants have accepted (only for non-HOST_SELECTED battles)
        const acceptedParticipants = battle.participants.filter(
            (p) => p.status === PKBattleParticipantStatus.ACCEPTED
        )

        if (acceptedParticipants.length !== 2) {
            throw new BadRequestException(
                'All participants must accept the battle before it can start'
            )
        }

        // Start the battle
        const now = new Date()
        battle.status = PKBattleStatus.ACTIVE
        battle.startTime = now
        battle.endTime = new Date(now.getTime() + battle.duration * 1000)

        // Update participant statuses
        for (const participant of battle.participants) {
            participant.status = PKBattleParticipantStatus.ACTIVE
            participant.joinedAt = now
            await this.pkBattleParticipantRepository.save(participant)
        }

        const savedBattle = await this.pkBattleRepository.save(battle)

        // Schedule battle end
        setTimeout(async () => {
            try {
                await this.endPKBattle(battleId)
            } catch (error) {
                this.logger.error(
                    `Failed to auto-end PK battle ${battleId}: ${error.message}`
                )
            }
        }, battle.duration * 1000)

        return savedBattle
    }

    /**
     * Handle participant response to PK Battle invitation
     */
    async respondToPKBattle(
        battleId: string,
        userId: string,
        accepted: boolean
    ): Promise<PKBattleParticipant> {
        const participant = await this.pkBattleParticipantRepository.findOne({
            where: {
                battleId,
                userId
            },
            relations: ['battle']
        })

        if (!participant) {
            throw new NotFoundException('PK Battle participant not found')
        }

        // HOST_SELECTED battles start automatically, no response needed
        if (participant.battle.battleType === PKBattleType.HOST_SELECTED) {
            throw new BadRequestException(
                'HOST_SELECTED battles do not require participant approval - they start automatically'
            )
        }

        // For other battle types, check if battle is still pending
        if (participant.battle.status !== PKBattleStatus.PENDING) {
            throw new BadRequestException(
                'Cannot respond to a battle that is not pending'
            )
        }

        // Check if already responded
        if (participant.status !== PKBattleParticipantStatus.INVITED) {
            throw new BadRequestException(
                'Already responded to this battle invitation'
            )
        }

        participant.status = accepted
            ? PKBattleParticipantStatus.ACCEPTED
            : PKBattleParticipantStatus.DECLINED

        return await this.pkBattleParticipantRepository.save(participant)
    }

    /**
     * Send a gift to a participant in a PK Battle
     */
    async sendPKBattleGift(
        battleId: string,
        giftId: string,
        senderId: string,
        receiverId: string,
        quantity: number = 1,
        message?: string
    ): Promise<PKBattleGift> {
        // Validate battle exists and is active
        const battle = await this.pkBattleRepository.findOne({
            where: {
                uuid: battleId,
                status: PKBattleStatus.ACTIVE,
                isActive: true
            },
            relations: ['participants']
        })

        if (!battle) {
            throw new NotFoundException('Active PK Battle not found')
        }

        // Check if battle has ended
        if (battle.endTime && new Date() > battle.endTime) {
            throw new BadRequestException('PK Battle has ended')
        }

        // Validate receiver is a participant
        const participant = battle.participants.find(
            (p) => p.userId === receiverId
        )
        if (!participant) {
            throw new BadRequestException(
                'Receiver is not a participant in this battle'
            )
        }

        // Validate gift exists
        const gift = await this.giftRepository.findOne({
            where: { uuid: giftId, isActive: true }
        })

        if (!gift) {
            throw new NotFoundException(`Gift with ID ${giftId} not found`)
        }

        // Validate sender is in the room (but not necessarily a participant)
        const senderInRoom = await this.isUserInRoom(senderId, battle.roomId)
        if (!senderInRoom) {
            throw new ForbiddenException(
                'You must be in the room to send gifts'
            )
        }

        // Create the battle gift record
        const totalValue = gift.price * quantity
        const battleGift = this.pkBattleGiftRepository.create({
            battleId,
            giftId,
            senderId,
            receiverId,
            giftValue: gift.price,
            quantity,
            message,
            sentAt: new Date(),
            metadata: {
                giftName: gift.name,
                giftImageUrl: gift.imageUrl
            }
        })

        const savedGift = await this.pkBattleGiftRepository.save(battleGift)

        // Update participant's gift stats
        participant.totalGiftsReceived += totalValue
        participant.giftCount += quantity
        await this.pkBattleParticipantRepository.save(participant)

        // Update battle total gifts value
        battle.totalGiftsValue += totalValue
        await this.pkBattleRepository.save(battle)

        // Load complete gift data for response
        return await this.pkBattleGiftRepository.findOne({
            where: { uuid: savedGift.uuid },
            relations: ['gift', 'sender', 'receiver', 'battle']
        })
    }

    /**
     * Get PK Battle details with current stats
     */
    async getPKBattleDetails(battleId: string): Promise<any> {
        const battle = await this.pkBattleRepository.findOne({
            where: { uuid: battleId, isActive: true },
            relations: [
                'participants',
                'participants.user',
                'host',
                'room',
                'gifts',
                'gifts.gift',
                'gifts.sender'
            ]
        })

        if (!battle) {
            throw new NotFoundException(
                `PK Battle with ID ${battleId} not found`
            )
        }

        // Calculate remaining time
        const now = new Date()
        let remainingTime = 0
        if (battle.status === PKBattleStatus.ACTIVE && battle.endTime) {
            remainingTime = Math.max(
                0,
                Math.floor((battle.endTime.getTime() - now.getTime()) / 1000)
            )
        }

        // Calculate total gifts value first
        const totalGiftsValue = battle.participants.reduce(
            (sum, p) => sum + p.totalGiftsReceived,
            0
        )

        // Sort participants by gifts received (for leaderboard) and add individual percentages
        const participantsWithStats = battle.participants
            .map((participant) => {
                const individualPercentage =
                    totalGiftsValue > 0
                        ? Math.round(
                              (participant.totalGiftsReceived /
                                  totalGiftsValue) *
                                  100
                          )
                        : 0

                return {
                    userId: participant.userId,
                    position: participant.position,
                    name: participant.user.name,
                    avatar: participant.user.avatarUrl,
                    totalGiftsReceived: participant.totalGiftsReceived,
                    giftCount: participant.giftCount,
                    status: participant.status,
                    percentage: individualPercentage // Individual participant percentage
                }
            })
            .sort((a, b) => b.totalGiftsReceived - a.totalGiftsReceived)

        // Calculate progress percentages for two participants (left/right display)
        let leftProgress = 0
        let rightProgress = 0

        if (totalGiftsValue > 0 && participantsWithStats.length >= 2) {
            const leftValue = participantsWithStats[0]?.totalGiftsReceived || 0
            const rightValue = participantsWithStats[1]?.totalGiftsReceived || 0
            leftProgress = Math.round((leftValue / totalGiftsValue) * 100)
            rightProgress = Math.round((rightValue / totalGiftsValue) * 100)
        } else if (participantsWithStats.length >= 2) {
            leftProgress = 50
            rightProgress = 50
        }

        // Get recent gifts
        const recentGifts = battle.gifts
            .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
            .slice(0, 20)
            .map((gift) => ({
                id: gift.uuid,
                giftName: gift.gift.name,
                giftImageUrl: gift.gift.imageUrl,
                senderId: gift.senderId,
                senderName: gift.sender.name,
                receiverId: gift.receiverId,
                quantity: gift.quantity,
                value: gift.giftValue * gift.quantity,
                message: gift.message,
                sentAt: gift.sentAt
            }))

        return {
            battleId: battle.uuid,
            roomId: battle.roomId,
            hostId: battle.hostId,
            hostName: battle.host.name,
            battleType: battle.battleType,
            status: battle.status,
            duration: battle.duration,
            startTime: battle.startTime,
            endTime: battle.endTime,
            remainingTime,
            description: battle.description,
            totalGiftsValue: battle.totalGiftsValue,
            participants: participantsWithStats,
            recentGifts,
            // Progress percentages for left/right participants
            progress: {
                leftProgress,
                rightProgress,
                leftParticipant: participantsWithStats[0] || null,
                rightParticipant: participantsWithStats[1] || null,
                // Individual participant percentages for all participants
                participantPercentages: participantsWithStats.map((p) => ({
                    userId: p.userId,
                    name: p.name,
                    percentage: p.percentage,
                    position: p.position
                }))
            },
            winner: battle.winnerId
                ? {
                      userId: battle.winnerId,
                      name: participantsWithStats.find(
                          (p) => p.userId === battle.winnerId
                      )?.name
                  }
                : null,
            createdAt: battle.createdAt
        }
    }

    /**
     * Get highest gift sender in a PK Battle
     */
    async getPKBattleHighestSender(battleId: string): Promise<any> {
        const battle = await this.pkBattleRepository.findOne({
            where: { uuid: battleId, isActive: true },
            relations: ['gifts', 'gifts.sender']
        })

        if (!battle) {
            throw new NotFoundException(
                `PK Battle with ID ${battleId} not found`
            )
        }

        // Group gifts by sender and calculate total value sent
        const senderTotals = new Map<
            string,
            {
                senderId: string
                senderName: string
                senderAvatar: string | null
                totalValue: number
                giftCount: number
            }
        >()

        for (const gift of battle.gifts) {
            const senderId = gift.senderId
            const totalValue = gift.giftValue * gift.quantity

            if (senderTotals.has(senderId)) {
                const existing = senderTotals.get(senderId)!
                existing.totalValue += totalValue
                existing.giftCount += gift.quantity
            } else {
                senderTotals.set(senderId, {
                    senderId: senderId,
                    senderName: gift.sender.name,
                    senderAvatar: gift.sender.avatarUrl || null,
                    totalValue: totalValue,
                    giftCount: gift.quantity
                })
            }
        }

        // Find highest sender
        let highestSender = null
        let maxValue = 0

        for (const senderData of senderTotals.values()) {
            if (senderData.totalValue > maxValue) {
                maxValue = senderData.totalValue
                highestSender = senderData
            }
        }

        return {
            battleId: battle.uuid,
            roomId: battle.roomId,
            highestGroupSender: highestSender
                ? {
                      senderId: highestSender.senderId,
                      name: highestSender.senderName,
                      avatar: highestSender.senderAvatar,
                      totalValue: highestSender.totalValue,
                      giftCount: highestSender.giftCount
                  }
                : null,
            totalSenders: senderTotals.size,
            allSenders: Array.from(senderTotals.values()).sort(
                (a, b) => b.totalValue - a.totalValue
            )
        }
    }

    /**
     * End a PK Battle (either manually or automatically)
     */
    async endPKBattle(battleId: string, hostId?: string): Promise<PKBattle> {
        const battle = await this.pkBattleRepository.findOne({
            where: { uuid: battleId, isActive: true },
            relations: ['participants', 'participants.user']
        })

        if (!battle) {
            throw new NotFoundException(
                `PK Battle with ID ${battleId} not found`
            )
        }

        // If hostId is provided, verify permission
        if (hostId && battle.hostId !== hostId) {
            throw new ForbiddenException(
                'Only the battle host can manually end battles'
            )
        }

        if (battle.status !== PKBattleStatus.ACTIVE) {
            throw new BadRequestException('Battle is not active')
        }

        // Determine winner (participant with most gifts received)
        const sortedParticipants = battle.participants.sort(
            (a, b) => b.totalGiftsReceived - a.totalGiftsReceived
        )

        let winnerId: string | null = null
        if (
            sortedParticipants.length >= 2 &&
            sortedParticipants[0].totalGiftsReceived >
                sortedParticipants[1].totalGiftsReceived
        ) {
            winnerId = sortedParticipants[0].userId
        }

        // Update battle status
        battle.status = PKBattleStatus.COMPLETED
        battle.winnerId = winnerId
        battle.endTime = new Date()

        // Update participant statuses
        for (const participant of battle.participants) {
            participant.status = PKBattleParticipantStatus.COMPLETED
            await this.pkBattleParticipantRepository.save(participant)
        }

        return await this.pkBattleRepository.save(battle)
    }

    /**
     * Cancel a PK Battle
     */
    async cancelPKBattle(
        battleId: string,
        hostId: string,
        reason?: string
    ): Promise<PKBattle> {
        const battle = await this.pkBattleRepository.findOne({
            where: { uuid: battleId, isActive: true }
        })

        if (!battle) {
            throw new NotFoundException(
                `PK Battle with ID ${battleId} not found`
            )
        }

        if (battle.hostId !== hostId) {
            throw new ForbiddenException(
                'Only the battle host can cancel battles'
            )
        }

        if (
            ![
                PKBattleStatus.PENDING,
                PKBattleStatus.APPROVED,
                PKBattleStatus.ACTIVE
            ].includes(battle.status)
        ) {
            throw new BadRequestException(
                'Cannot cancel a completed or already cancelled battle'
            )
        }

        battle.status = PKBattleStatus.CANCELLED
        battle.metadata = {
            ...battle.metadata,
            cancellationReason: reason,
            cancelledAt: new Date()
        }

        return await this.pkBattleRepository.save(battle)
    }

    /**
     * Get active PK Battle in a room
     */
    async getActivePKBattle(roomId: string): Promise<any | null> {
        const battle = await this.pkBattleRepository.findOne({
            where: {
                roomId,
                status: PKBattleStatus.ACTIVE,
                isActive: true
            },
            relations: ['participants', 'participants.user', 'host']
        })

        if (!battle) {
            return null
        }

        // Check if the battle has expired and auto-complete it
        const now = new Date()
        if (battle.endTime && now > battle.endTime) {
            // Automatically end the expired battle
            await this.endPKBattle(battle.uuid)
            return null // Return null since the battle is now completed
        }

        return await this.getPKBattleDetails(battle.uuid)
    }

    /**
     * Get PK Battle history for a room
     */
    async getRoomPKBattleHistory(
        roomId: string,
        limit: number = 10,
        offset: number = 0
    ): Promise<any[]> {
        const battles = await this.pkBattleRepository.find({
            where: { roomId, isActive: true },
            relations: ['participants', 'participants.user', 'host', 'winner'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset
        })

        return battles.map((battle) => ({
            battleId: battle.uuid,
            battleType: battle.battleType,
            status: battle.status,
            hostName: battle.host.name,
            participants: battle.participants.map((p) => ({
                name: p.user.name,
                avatar: p.user.avatarUrl,
                totalGiftsReceived: p.totalGiftsReceived
            })),
            winner: battle.winner
                ? {
                      name: battle.winner.name,
                      avatar: battle.winner.avatarUrl
                  }
                : null,
            totalGiftsValue: battle.totalGiftsValue,
            duration: battle.duration,
            createdAt: battle.createdAt,
            endTime: battle.endTime
        }))
    }

    // ==================== ROOM PROFILE METHODS ====================

    /**
     * Get detailed user profile in room context
     * Shows role, privileges, intimacy connections when user is tapped in room
     */
    async getUserProfile(userId: string, currentUserId?: string): Promise<any> {
        this.logger.log(
            `👤 GET_USER_PROFILE: Getting profile for user ${userId}`
        )

        try {
            // Fetch user with related data
            const user = await this.userRepository.findOne({
                where: { uuid: userId },
                select: [
                    'uuid',
                    'name',
                    'displayName',
                    'email',
                    'avatarUrl',
                    'coverImage',
                    'bio',
                    'level',
                    'badge',
                    'binsBalance',
                    'diamondBalance',
                    'country',
                    'frames',
                    'entryEffects',
                    'purchasedGifts'
                ]
            })

            if (!user) {
                throw new NotFoundException(`User with ID ${userId} not found`)
            }

            // Get user's room roles (check all active rooms)
            const userRoles = await this.roomRoleRepository.find({
                where: { userId, isActive: true },
                order: { assignedAt: 'DESC' }
            })

            // Determine primary role (prioritize: owner > host > admin > speaker > listener)
            let primaryRole = 'listener'
            if (userRoles.find((r) => r.role === RoomRole.OWNER)) {
                primaryRole = 'owner'
            } else if (userRoles.find((r) => r.role === RoomRole.HOST)) {
                primaryRole = 'host'
            } else if (userRoles.find((r) => r.role === RoomRole.ADMIN)) {
                primaryRole = 'admin'
            } else if (userRoles.find((r) => r.role === RoomRole.SPEAKER)) {
                primaryRole = 'speaker'
            }

            // Get followers count from friendships
            const followersCount = await this.getFollowersCount(userId)

            // Get user profile stats
            const profileStats = await this.getUserProfileStats(userId)

            // Get gift wall data (gifts received)
            const giftWallData = await this.getUserGiftWall(userId)

            // Get decoration/purchases data
            const decorationData = await this.getUserDecorations(user)

            // Get intimacy connections
            const intimacyData = await this.getUserIntimacyConnections(
                userId,
                currentUserId
            )

            // Get current room context if user is in a room
            const roomContext = await this.getUserCurrentRoomContext(userId)

            // Build the response maintaining the exact structure
            const profileData = {
                userId: user.uuid,
                name: user.name || user.email,
                displayName: user.displayName || user.name || user.email,
                role: primaryRole,
                location:
                    user.country ||
                    profileStats?.location ||
                    'Unknown Location',
                followersCount: followersCount,
                profile: {
                    avatarUrl:
                        user.avatarUrl ||
                        'https://res.cloudinary.com/demo/image/upload/v1640123456/default_avatar.jpg',
                    coverPhoto:
                        user.coverImage ||
                        'https://res.cloudinary.com/demo/image/upload/v1640123456/default_cover.jpg',
                    bio: user.bio || profileStats?.bio || 'No bio available',
                    level: user.level || 1,
                    badge: user.badge || [],
                    binsBalance: parseFloat(
                        user.binsBalance?.toString() || '0'
                    ),
                    diamondBalance: parseFloat(
                        user.diamondBalance?.toString() || '0'
                    )
                },
                privileges: {
                    giftWall: giftWallData,
                    decoration: decorationData
                },
                intimacy: intimacyData,
                roomContext: roomContext,
                stats: {
                    totalRoomsJoined: profileStats?.totalRoomsJoined || 0,
                    totalTimeInRooms: `${profileStats?.totalTimeInRoomsHours || 0} hours`,
                    favoriteRoomType:
                        profileStats?.favoriteRoomType || 'General',
                    hostingExperience: `${profileStats?.hostingExperienceMonths || 0} months`,
                    communityRating: parseFloat(
                        profileStats?.communityRating?.toString() || '0'
                    ),
                    totalGiftsReceived: profileStats?.totalGiftsReceived || 0,
                    totalGiftsSent: profileStats?.totalGiftsSent || 0,
                    achievements: profileStats?.achievements || []
                }
            }

            this.logger.log(
                `✅ GET_USER_PROFILE: Successfully fetched profile for user ${userId}`
            )

            return profileData
        } catch (error) {
            this.logger.error(
                `❌ GET_USER_PROFILE: Failed to fetch profile for user ${userId}`,
                error.stack
            )
            throw error
        }
    }

    // Helper method to get followers count
    private async getFollowersCount(userId: string): Promise<number> {
        const followersCount = await this.friendshipRepository.count({
            where: {
                friendId: userId,
                status: FriendshipStatus.ACCEPTED
            }
        })

        return followersCount
    }

    // Helper method to get or create user profile stats
    private async getUserProfileStats(
        userId: string
    ): Promise<UserProfileStats> {
        let stats = await this.userProfileStatsRepository.findOne({
            where: { userId }
        })

        if (!stats) {
            // Create default stats if not exists
            stats = this.userProfileStatsRepository.create({
                userId,
                totalRoomsJoined: 0,
                totalTimeInRoomsHours: 0,
                favoriteRoomType: 'General',
                hostingExperienceMonths: 0,
                communityRating: 4.0,
                totalGiftsReceived: 0,
                totalGiftsSent: 0,
                achievements: [],
                followersCount: 0,
                location: 'Unknown',
                bio: ''
            })
            stats = await this.userProfileStatsRepository.save(stats)
        }

        // Update stats with actual room participation data
        const roomCount = await this.participantRepository.count({
            where: { userId }
        })

        if (roomCount > 0 && stats.totalRoomsJoined !== roomCount) {
            stats.totalRoomsJoined = roomCount
            await this.userProfileStatsRepository.save(stats)
        }

        return stats
    }

    // Helper method to get gift wall data
    private async getUserGiftWall(userId: string): Promise<any> {
        // Get total gift count and value
        const giftStats = await this.giftTransactionRepository
            .createQueryBuilder('gt')
            .select('COUNT(*)', 'count')
            .addSelect('SUM(gt.amount * gt.quantity)', 'totalValue')
            .where('gt.receiverId = :userId', { userId })
            .getRawOne()

        // Get recent 5 gifts with details
        const recentGifts = await this.giftTransactionRepository
            .createQueryBuilder('gt')
            .leftJoinAndSelect('gt.gift', 'gift')
            .leftJoinAndSelect('gt.sender', 'sender')
            .where('gt.receiverId = :userId', { userId })
            .orderBy('gt.createdAt', 'DESC')
            .limit(5)
            .getMany()

        const formattedGifts = recentGifts.map((transaction) => ({
            giftId: transaction.giftId,
            name: transaction.gift?.name || 'Unknown Gift',
            imageUrl:
                transaction.gift?.imageUrl || transaction.gift?.giftImage || '',
            value: parseFloat(transaction.amount?.toString() || '0'),
            senderName:
                transaction.sender?.name ||
                transaction.sender?.displayName ||
                transaction.sender?.email ||
                'Anonymous',
            receivedAt: transaction.createdAt
        }))

        return {
            count: parseInt(giftStats?.count || '0'),
            totalValue: parseFloat(giftStats?.totalValue || '0'),
            recentGifts: formattedGifts
        }
    }

    // Helper method to get user decorations
    private async getUserDecorations(user: any): Promise<any> {
        const decorations = []

        // Add frames as decorations
        if (user.frames && Array.isArray(user.frames)) {
            user.frames.forEach((frame: any) => {
                decorations.push({
                    decorationId: frame.id || `frame-${Date.now()}`,
                    name: frame.name || 'Custom Frame',
                    imageUrl: frame.imageUrl || frame.url || '',
                    type: 'frame',
                    isActive: frame.isActive || false,
                    purchasedAt: frame.purchasedAt || new Date(),
                    price: frame.price || 0
                })
            })
        }

        // Add entry effects as decorations
        if (user.entryEffects && Array.isArray(user.entryEffects)) {
            user.entryEffects.forEach((effect: any) => {
                decorations.push({
                    decorationId: effect.id || `effect-${Date.now()}`,
                    name: effect.name || 'Entry Effect',
                    imageUrl: effect.imageUrl || effect.url || '',
                    type: 'effect',
                    isActive: effect.isActive || false,
                    purchasedAt: effect.purchasedAt || new Date(),
                    price: effect.price || 0
                })
            })
        }

        // Add purchased gifts as decorations
        if (user.purchasedGifts && Array.isArray(user.purchasedGifts)) {
            user.purchasedGifts.forEach((gift: any) => {
                decorations.push({
                    decorationId: gift.id || `gift-${Date.now()}`,
                    name: gift.name || 'Special Item',
                    imageUrl: gift.imageUrl || gift.url || '',
                    type: 'special',
                    isActive: false,
                    purchasedAt: gift.purchasedAt || new Date(),
                    price: gift.price || 0
                })
            })
        }

        // Calculate total spent
        const totalSpent = decorations.reduce(
            (sum, item) => sum + (item.price || 0),
            0
        )

        // Sort by purchase date and take the 4 most recent active ones
        const activeDecorations = decorations
            .sort(
                (a, b) =>
                    new Date(b.purchasedAt).getTime() -
                    new Date(a.purchasedAt).getTime()
            )
            .slice(0, 4)

        return {
            count: decorations.length,
            totalSpent: totalSpent,
            activeDecorations: activeDecorations
        }
    }

    // Helper method to get intimacy connections
    private async getUserIntimacyConnections(
        userId: string,
        currentUserId?: string
    ): Promise<any> {
        // Get gift exchange statistics between users
        const intimacyQuery = await this.giftTransactionRepository
            .createQueryBuilder('gt')
            .select(
                'CASE WHEN gt.senderId = :userId THEN gt.receiverId ELSE gt.senderId END',
                'connecteduserid'
            )
            .addSelect('COUNT(*)', 'exchangecount')
            .addSelect('SUM(gt.amount * gt.quantity)', 'totalvalue')
            .addSelect('MAX(gt.createdAt)', 'lastinteraction')
            .where('(gt.senderId = :userId OR gt.receiverId = :userId)', {
                userId
            })
            .groupBy('connecteduserid')
            .orderBy('exchangecount', 'DESC')
            .limit(5)
            .getRawMany()

        // Get user details for top connections
        const topConnections = []
        for (const connection of intimacyQuery) {
            const connectedUser = await this.userRepository.findOne({
                where: { uuid: connection.connecteduserid },
                select: ['uuid', 'name', 'displayName', 'avatarUrl']
            })

            if (connectedUser) {
                // Calculate mutual gifts
                const mutualGifts = await this.giftTransactionRepository
                    .createQueryBuilder('gt')
                    .where(
                        'gt.senderId = :userId AND gt.receiverId = :connectedId',
                        {
                            userId,
                            connectedId: connection.connecteduserid
                        }
                    )
                    .orWhere(
                        'gt.senderId = :connectedId AND gt.receiverId = :userId',
                        {
                            userId,
                            connectedId: connection.connecteduserid
                        }
                    )
                    .getCount()

                // Calculate intimacy level (0-100 scale)
                const intimacyLevel = Math.min(
                    100,
                    Math.floor(
                        parseInt(connection.exchangecount) * 2 +
                            mutualGifts * 5 +
                            Math.log(
                                parseFloat(connection.totalvalue || '0') + 1
                            ) *
                                3
                    )
                )

                // Calculate relationship duration
                const firstInteraction = await this.giftTransactionRepository
                    .createQueryBuilder('gt')
                    .where(
                        '(gt.senderId = :userId AND gt.receiverId = :connectedId) OR (gt.senderId = :connectedId AND gt.receiverId = :userId)',
                        {
                            userId,
                            connectedId: connection.connecteduserid
                        }
                    )
                    .orderBy('gt.createdAt', 'ASC')
                    .getOne()

                const durationDays = firstInteraction
                    ? Math.floor(
                          (Date.now() - firstInteraction.createdAt.getTime()) /
                              (1000 * 60 * 60 * 24)
                      )
                    : 0

                let relationshipDuration = '< 1 week'
                if (durationDays > 365) {
                    relationshipDuration = `${Math.floor(durationDays / 365)} year${durationDays >= 730 ? 's' : ''}`
                } else if (durationDays > 30) {
                    relationshipDuration = `${Math.floor(durationDays / 30)} month${durationDays >= 60 ? 's' : ''}`
                } else if (durationDays > 7) {
                    relationshipDuration = `${Math.floor(durationDays / 7)} week${durationDays >= 14 ? 's' : ''}`
                }

                // Determine connection strength
                let connectionStrength = 'Weak'
                if (intimacyLevel >= 80) {
                    connectionStrength = 'Very Strong'
                } else if (intimacyLevel >= 60) {
                    connectionStrength = 'Strong'
                } else if (intimacyLevel >= 40) {
                    connectionStrength = 'Good'
                } else if (intimacyLevel >= 20) {
                    connectionStrength = 'Moderate'
                }

                topConnections.push({
                    userId: connectedUser.uuid,
                    name: connectedUser.name || connectedUser.displayName,
                    displayName:
                        connectedUser.displayName || connectedUser.name,
                    avatarUrl: connectedUser.avatarUrl || null,
                    intimacyLevel,
                    connectionType:
                        mutualGifts > 10
                            ? 'gift_exchange'
                            : 'frequent_interaction',
                    giftExchangeCount: parseInt(connection.exchangecount),
                    totalGiftValue: parseFloat(connection.totalvalue || '0'),
                    mutualGifts,
                    lastInteraction: connection.lastinteraction,
                    relationshipDuration,
                    connectionStrength
                })
            }
        }

        // Calculate overall intimacy score (0-10 scale)
        const intimacyScore =
            topConnections.length > 0
                ? Math.min(
                      10,
                      topConnections.reduce(
                          (sum, c) => sum + c.intimacyLevel,
                          0
                      ) /
                          (topConnections.length * 10)
                  )
                : 0

        return {
            totalConnections: intimacyQuery.length,
            intimacyScore: Math.round(intimacyScore * 10) / 10,
            topConnections
        }
    }

    // Helper method to get current room context
    private async getUserCurrentRoomContext(
        userId: string
    ): Promise<any | null> {
        // Check if user is currently in any room
        const currentParticipation = await this.participantRepository.findOne({
            where: { userId },
            relations: ['room'],
            order: { createdAt: 'DESC' }
        })

        if (!currentParticipation) {
            return null
        }

        const room = currentParticipation.room
        const roomId = room.uuid

        // Calculate time in room
        const joinTime = currentParticipation.createdAt
        const now = new Date()
        const timeInMinutes = Math.floor(
            (now.getTime() - joinTime.getTime()) / (1000 * 60)
        )
        const hours = Math.floor(timeInMinutes / 60)
        const minutes = timeInMinutes % 60
        const timeInRoom =
            hours > 0
                ? `${hours} hours ${minutes} minutes`
                : `${minutes} minutes`

        // Get user's role in this room
        const roomRole = await this.roomRoleRepository.findOne({
            where: { roomId, userId, isActive: true }
        })

        // Count comments in room
        const commentsCount = await this.roomCommentRepository.count({
            where: { roomId, userId }
        })

        // Count gifts given and received in this room
        const giftsGiven = await this.giftTransactionRepository.count({
            where: { roomId, senderId: userId }
        })

        const giftsReceived = await this.giftTransactionRepository.count({
            where: { roomId, receiverId: userId }
        })

        // Get recent interactions (last 3)
        const recentComments = await this.roomCommentRepository.find({
            where: { roomId, userId },
            order: { createdAt: 'DESC' },
            take: 2
        })

        const recentGiftReceived = await this.giftTransactionRepository.findOne(
            {
                where: { roomId, receiverId: userId },
                relations: ['sender', 'gift'],
                order: { createdAt: 'DESC' }
            }
        )

        const roomInteractions = []

        // Add recent comments as interactions
        recentComments.forEach((comment) => {
            roomInteractions.push({
                type: 'comment',
                content: comment.message,
                timestamp: comment.createdAt
            })
        })

        // Add recent gift received as interaction
        if (recentGiftReceived) {
            roomInteractions.push({
                type: 'gift_received',
                from:
                    recentGiftReceived.sender?.name ||
                    recentGiftReceived.sender?.displayName ||
                    'Anonymous',
                giftName: recentGiftReceived.gift?.name || 'Gift',
                timestamp: recentGiftReceived.createdAt
            })
        }

        // Sort interactions by timestamp
        roomInteractions.sort(
            (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
        )

        return {
            roomId,
            roomName: room.name,
            joinedAt: joinTime,
            timeInRoom,
            seatNumber: currentParticipation.seatNumber,
            isHost: roomRole?.role === RoomRole.HOST || room.ownerId === userId,
            contributions: {
                commentsCount,
                giftsGivenInRoom: giftsGiven,
                giftsReceivedInRoom: giftsReceived
            },
            roomInteractions: roomInteractions.slice(0, 3)
        }
    }

    /**
     * Get highest gift sender to a specific user in a room
     * Returns the user who sent the most gifts (by value) to the specified receiver in the room
     */
    async getHighestGiftSenderToUser(
        roomId: string,
        receiverId: string,
        period?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'all'
    ): Promise<{
        highestSender: {
            userId: string
            userName: string
            userAvatar: string
            totalGiftValue: number
            totalGiftCount: number
            topGift: {
                giftId: string
                giftName: string
                giftImage: string
                value: number
                quantity: number
            } | null
        } | null
        allSenders: Array<{
            userId: string
            userName: string
            userAvatar: string
            totalGiftValue: number
            totalGiftCount: number
            rank: number
        }>
        timeframe: string
    }> {
        this.logger.log(
            `📊 Getting highest gift sender to user ${receiverId} in room ${roomId} (period: ${period || 'all'})`
        )

        // Calculate time range based on period
        let startDate: Date
        const endDate = new Date()

        switch (period) {
            case 'hourly':
                startDate = new Date(Date.now() - 3600000) // 1 hour
                break
            case 'daily':
                startDate = new Date(Date.now() - 86400000) // 24 hours
                break
            case 'weekly':
                startDate = new Date(Date.now() - 7 * 86400000) // 7 days
                break
            case 'monthly':
                startDate = new Date(Date.now() - 30 * 86400000) // 30 days
                break
            default:
                startDate = new Date(0) // All time
        }

        try {
            // Build query to get gift transactions
            const queryBuilder = this.giftTransactionRepository
                .createQueryBuilder('gt')
                .leftJoinAndSelect('gt.gift', 'gift')
                .leftJoinAndSelect('gt.sender', 'sender')
                .where('gt.roomId = :roomId', { roomId })
                .andWhere('gt.receiverId = :receiverId', { receiverId })
                .andWhere('gt.status = :status', { status: 'completed' })
                .andWhere('gt.createdAt BETWEEN :startDate AND :endDate', {
                    startDate,
                    endDate
                })

            const transactions = await queryBuilder.getMany()

            if (transactions.length === 0) {
                return {
                    highestSender: null,
                    allSenders: [],
                    timeframe: period || 'all'
                }
            }

            // Aggregate gifts by sender
            const senderStats = new Map<
                string,
                {
                    userId: string
                    userName: string
                    userAvatar: string
                    totalGiftValue: number
                    totalGiftCount: number
                    gifts: Array<{
                        giftId: string
                        giftName: string
                        giftImage: string
                        value: number
                        quantity: number
                    }>
                }
            >()

            for (const transaction of transactions) {
                const senderId = transaction.senderId
                const giftValue =
                    parseFloat(transaction.amount?.toString() || '0') *
                    transaction.quantity

                if (!senderStats.has(senderId)) {
                    senderStats.set(senderId, {
                        userId: senderId,
                        userName: transaction.sender?.name || 'Unknown User',
                        userAvatar:
                            transaction.sender?.avatarUrl ||
                            'https://via.placeholder.com/150',
                        totalGiftValue: 0,
                        totalGiftCount: 0,
                        gifts: []
                    })
                }

                const stats = senderStats.get(senderId)!
                stats.totalGiftValue += giftValue
                stats.totalGiftCount += transaction.quantity

                // Track individual gifts for finding top gift
                stats.gifts.push({
                    giftId: transaction.gift?.uuid || transaction.giftId,
                    giftName: transaction.gift?.name || 'Unknown Gift',
                    giftImage:
                        transaction.gift?.imageUrl ||
                        'https://via.placeholder.com/100',
                    value: giftValue,
                    quantity: transaction.quantity
                })
            }

            // Convert to array and sort by total gift value
            const sendersArray = Array.from(senderStats.values())
            sendersArray.sort((a, b) => b.totalGiftValue - a.totalGiftValue)

            // Get highest sender
            const highestSender = sendersArray[0]
            const topGift = highestSender?.gifts.sort(
                (a, b) => b.value - a.value
            )[0]

            // Format all senders with rank
            const allSenders = sendersArray.map((sender, index) => ({
                userId: sender.userId,
                userName: sender.userName,
                userAvatar: sender.userAvatar,
                totalGiftValue: Math.round(sender.totalGiftValue * 100) / 100,
                totalGiftCount: sender.totalGiftCount,
                rank: index + 1
            }))

            this.logger.log(
                `✅ Found ${allSenders.length} gift senders to user ${receiverId} in room ${roomId}`
            )
            this.logger.log(
                `   ├─ Highest Sender: ${highestSender.userName} (${highestSender.userId})`
            )
            this.logger.log(
                `   ├─ Total Value: ${Math.round(highestSender.totalGiftValue * 100) / 100}`
            )
            this.logger.log(
                `   └─ Total Gifts: ${highestSender.totalGiftCount}`
            )

            return {
                highestSender: {
                    userId: highestSender.userId,
                    userName: highestSender.userName,
                    userAvatar: highestSender.userAvatar,
                    totalGiftValue:
                        Math.round(highestSender.totalGiftValue * 100) / 100,
                    totalGiftCount: highestSender.totalGiftCount,
                    topGift: topGift || null
                },
                allSenders,
                timeframe: period || 'all'
            }
        } catch (error) {
            this.logger.error(
                `❌ Error getting highest gift sender: ${error.message}`
            )
            throw new HttpException(
                'Failed to get highest gift sender',
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }
}
