import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
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
import { Room } from './entities/room.entity'
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
                // Validate file type and size
                const allowedMimeTypes = [
                    'image/jpeg',
                    'image/jpg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                    'image/bmp',
                    'image/tiff',
                    'image/svg+xml',
                    'image/avif',
                    'image/heic',
                    'image/heif',
                    'image/x-icon'
                ]

                if (!allowedMimeTypes.includes(avatarFile.mimetype)) {
                    throw new BadRequestException(
                        'Invalid file type. Please upload a valid image file (JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO)'
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
        // Validate file type and size
        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',
            'image/tiff',
            'image/svg+xml',
            'image/avif',
            'image/heic',
            'image/heif',
            'image/x-icon',
            'image/vnd.microsoft.icon'
        ]

        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                'Invalid file type. Please upload a valid image file (JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO)'
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

    // ==================== SEAT MANAGEMENT METHODS ====================

    /**
     * Initialize seat records for a room
     */
    async initializeRoomSeats(roomId: string, maxSeats: number): Promise<void> {
        const seats = []
        for (let i = 0; i < maxSeats; i++) {
            seats.push(
                this.roomSeatRepository.create({
                    roomId,
                    seatIndex: i,
                    isLocked: false
                })
            )
        }
        await this.roomSeatRepository.save(seats)
    }

    /**
     * Validate and assign a specific seat to a user
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

        // Seat 0 is no longer reserved exclusively for host; eligibility is governed by locks only

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
     * Get current seat state for a room
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
                    participant?.user?.uuid || participant?.userId || null
            })
        }

        return seats
    }

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
            throw new ConflictException(
                'There is already an active PK battle in this room'
            )
        }

        // Create the battle
        const battle = this.pkBattleRepository.create({
            roomId,
            hostId,
            battleType,
            duration: durationMinutes * 60, // Convert to seconds
            status: PKBattleStatus.PENDING,
            description,
            metadata
        })

        const savedBattle = await this.pkBattleRepository.save(battle)

        // Create battle participants
        for (let i = 0; i < participantIds.length; i++) {
            const participant = this.pkBattleParticipantRepository.create({
                battleId: savedBattle.uuid,
                userId: participantIds[i],
                position: i + 1,
                status: PKBattleParticipantStatus.INVITED
            })
            await this.pkBattleParticipantRepository.save(participant)
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

        if (battle.status !== PKBattleStatus.APPROVED) {
            throw new BadRequestException(
                'Battle must be approved before starting'
            )
        }

        // Check if all participants have accepted
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

        // Schedule battle end (you might want to use a job queue like Bull for this)
        setTimeout(async () => {
            await this.endPKBattle(battleId)
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
                userId,
                status: PKBattleParticipantStatus.INVITED
            },
            relations: ['battle']
        })

        if (!participant) {
            throw new NotFoundException(
                'PK Battle invitation not found or already responded'
            )
        }

        if (participant.battle.status !== PKBattleStatus.PENDING) {
            throw new BadRequestException(
                'Cannot respond to a battle that is not pending'
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

        // Sort participants by gifts received (for leaderboard)
        const participantsWithStats = battle.participants
            .map((participant) => ({
                userId: participant.userId,
                position: participant.position,
                name: participant.user.name,
                avatar: participant.user.avatarUrl,
                totalGiftsReceived: participant.totalGiftsReceived,
                giftCount: participant.giftCount,
                status: participant.status
            }))
            .sort((a, b) => b.totalGiftsReceived - a.totalGiftsReceived)

        // Get recent gifts
        const recentGifts = battle.gifts
            .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
            .slice(0, 20)
            .map((gift) => ({
                id: gift.uuid,
                giftName: gift.gift.name,
                giftImageUrl: gift.gift.imageUrl,
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
}
