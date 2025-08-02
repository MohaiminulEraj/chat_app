import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CloudinaryService } from '../cloudinary/cloudinary.service'
import { GroupMember } from '../group/entities/group-member.entity'
import { Group } from '../group/entities/group.entity'
import { User } from '../user/entities/user.entity'
import { RoomComment } from './entities/room-comment.entity'
import { RoomParticipant } from './entities/room-participant.entity'
import { RoomRole, RoomRoleAssignment } from './entities/room-role.entity'
import { RoomWaitingList } from './entities/room-waiting-list.entity'
import { Room } from './entities/room.entity'

@Injectable()
export class RoomService {
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
        @InjectRepository(RoomComment)
        private roomCommentRepository: Repository<RoomComment>,
        private cloudinaryService: CloudinaryService
    ) {}

    async createRoom(
        groupId: string,
        data: any,
        currentUser?: any
    ): Promise<Room> {
        // Validate that the group exists
        const group = await this.groupRepository.findOne({
            where: { uuid: groupId }
        })

        if (!group) {
            throw new NotFoundException(`Group with ID ${groupId} not found`)
        }

        // Validate that the user exists
        const userId = currentUser?.uuid || data.ownerId
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

        const room = this.roomRepository.create({
            ...data,
            groupId,
            maxSeats: data.maxSeats || 8,
            ownerId: userId,
            isLocked: data.isPrivate || false,
            password: data.isPrivate ? data.password : null
        })

        const savedRoom = await this.roomRepository.save(room)
        const finalRoom = Array.isArray(savedRoom) ? savedRoom[0] : savedRoom

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
            } catch (error) {
                console.error('Error assigning default roles:', error)
                // Continue without throwing error as room is already created
            }
        }

        return finalRoom
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
        password?: string
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

        // Check if user is already in the room
        const existingParticipant = await this.participantRepository.findOne({
            where: { roomId, userId }
        })

        if (existingParticipant) {
            throw new ConflictException('User is already in the room')
        }

        // Find available seat number
        const occupiedSeats = room.participants.map((p) => p.seatNumber)
        let seatNumber = 1
        for (seatNumber = 1; seatNumber <= room.maxSeats; seatNumber++) {
            if (!occupiedSeats.includes(seatNumber)) {
                break
            }
        }

        const participant = this.participantRepository.create({
            userId,
            roomId,
            seatNumber
        })

        return this.participantRepository.save(participant)
    }

    async leaveRoom(roomId: string, userId: string): Promise<void> {
        const participant = await this.participantRepository.findOne({
            where: { roomId, userId }
        })

        if (!participant) {
            throw new NotFoundException('Participant not found')
        }

        await this.participantRepository.remove(participant)

        // Check waiting list and promote first user
        await this.promoteFromWaitingList(roomId)
    }

    async updateParticipantStatus(
        roomId: string,
        userId: string,
        status: Partial<RoomParticipant>
    ): Promise<void> {
        const result = await this.participantRepository.update(
            { roomId, userId },
            status
        )

        if (result.affected === 0) {
            throw new NotFoundException('Participant not found')
        }
    }

    async addToWaitingList(roomId: string, userId: string): Promise<void> {
        // Check if already in waiting list
        const existing = await this.waitingListRepository.findOne({
            where: { roomId, userId }
        })

        if (existing) {
            return
        }

        // Get next position
        const lastInQueue = await this.waitingListRepository
            .createQueryBuilder('waiting')
            .where('waiting.roomId = :roomId', { roomId })
            .orderBy('waiting.position', 'DESC')
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

        // Get first in waiting list
        const nextUser = await this.waitingListRepository
            .createQueryBuilder('waiting')
            .where('waiting.roomId = :roomId', { roomId })
            .orderBy('waiting.position', 'ASC')
            .getOne()

        if (!nextUser) {
            return
        }

        // Remove from waiting list
        await this.waitingListRepository.remove(nextUser)

        // Add as participant - no password needed for promotion from waiting list
        await this.joinRoom(roomId, nextUser.userId)

        // Update positions in waiting list
        await this.waitingListRepository
            .createQueryBuilder()
            .update(RoomWaitingList)
            .set({ position: () => 'position - 1' })
            .where('roomId = :roomId AND position > :position', {
                roomId,
                position: nextUser.position
            })
            .execute()
    }

    async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
        return this.participantRepository.find({
            where: { roomId },
            relations: ['user'],
            order: { seatNumber: 'ASC' }
        })
    }

    async getRoomWaitingList(roomId: string): Promise<RoomWaitingList[]> {
        return this.waitingListRepository.find({
            where: { roomId },
            relations: ['user'],
            order: { position: 'ASC' }
        })
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

        // Get role assignments
        const roleAssignments = await this.roomRoleRepository.find({
            where: { roomId: room.uuid, isActive: true },
            relations: ['user']
        })

        // Find owner and host
        const ownerRole = roleAssignments.find(
            (role) => role.role === RoomRole.OWNER
        )
        const hostRole = roleAssignments.find(
            (role) => role.role === RoomRole.HOST
        )

        // Get all participants with their roles
        const participants = await this.participantRepository.find({
            where: { roomId: room.uuid },
            relations: ['user']
        })

        // Build member list with roles
        const members = participants.map((participant) => {
            const userRoles = roleAssignments.filter(
                (role) => role.userId === participant.userId
            )
            const primaryRole =
                userRoles.find((role) =>
                    [RoomRole.OWNER, RoomRole.HOST, RoomRole.ADMIN].includes(
                        role.role
                    )
                )?.role ||
                userRoles.find((role) => role.role === RoomRole.SPEAKER)
                    ?.role ||
                RoomRole.LISTENER

            return {
                _id: participant.user.uuid,
                name: participant.user.name,
                email: participant.user.email,
                image: participant.user.avatarUrl,
                role: primaryRole,
                status: !participant.isMuted && !participant.isDeafened, // Active if not muted or deafened
                join: true, // If they're a participant, they've joined
                invitedBy: room.ownerId, // Simplified - could be enhanced
                blocked: false // Simplified - could be enhanced with actual blocking logic
            }
        })

        // Format response to match the requested structure
        return {
            _id: room.uuid,
            name: room.name,
            description: room.description,
            country: room.group?.country || 'Unknown',
            roomAvatarUrl: room.roomAvatarUrl || null,
            roomOwner: ownerRole?.user
                ? {
                      id: ownerRole.user.id,
                      uuid: ownerRole.user.uuid,
                      name: ownerRole.user.name,
                      email: ownerRole.user.email,
                      phoneNumber: ownerRole.user.phoneNumber,
                      userType: ownerRole.user.userType,
                      authProvider: ownerRole.user.authProvider,
                      avatarUrl: ownerRole.user.avatarUrl,
                      isEmailVerified: ownerRole.user.isEmailVerified,
                      isPhoneVerified: ownerRole.user.isPhoneVerified
                  }
                : null,
            host: hostRole?.user
                ? {
                      id: hostRole.user.id,
                      uuid: hostRole.user.uuid,
                      name: hostRole.user.name,
                      email: hostRole.user.email,
                      phoneNumber: hostRole.user.phoneNumber,
                      userType: hostRole.user.userType,
                      authProvider: hostRole.user.authProvider,
                      avatarUrl: hostRole.user.avatarUrl,
                      isEmailVerified: hostRole.user.isEmailVerified,
                      isPhoneVerified: hostRole.user.isPhoneVerified
                  }
                : null,
            members
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
        metadata?: any
    ): Promise<RoomComment> {
        // Verify the user is a participant in the room
        const participant = await this.participantRepository.findOne({
            where: { roomId, userId }
        })

        if (!participant) {
            throw new ForbiddenException(
                'You must be a participant in the room to comment'
            )
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

        return await this.roomCommentRepository.save(comment)
    }

    /**
     * Get room comments with pagination
     */
    async getRoomComments(
        roomId: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ comments: RoomComment[]; pagination: any }> {
        const offset = (page - 1) * limit

        const [comments, total] = await this.roomCommentRepository.findAndCount(
            {
                where: { roomId, isVisible: true },
                relations: ['user'],
                order: { createdAt: 'DESC' },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    message: true,
                    messageType: true,
                    createdAt: true,
                    user: {
                        id: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        )

        const totalPages = Math.ceil(total / limit)

        return {
            comments,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        }
    }

    /**
     * Delete a room comment (only by the author or room moderators)
     */
    async deleteRoomComment(commentId: string, userId: string): Promise<void> {
        const comment = await this.roomCommentRepository.findOne({
            where: { uuid: commentId },
            relations: ['room']
        })

        if (!comment) {
            throw new NotFoundException('Comment not found')
        }

        // Check if user is the author or has moderation permissions
        const isAuthor = comment.userId === userId
        const userRoles = await this.getUserRolesInRoom(comment.roomId, userId)
        const canModerate =
            userRoles.includes(RoomRole.OWNER) ||
            userRoles.includes(RoomRole.HOST) ||
            userRoles.includes(RoomRole.ADMIN)

        if (!isAuthor && !canModerate) {
            throw new ForbiddenException(
                'You can only delete your own comments or have moderation permissions'
            )
        }

        await this.roomCommentRepository.update(commentId, { isVisible: false })
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
    async getRecommendedRooms(): Promise<any[]> {
        const rooms = await this.roomRepository.find({
            where: { isActive: true },
            relations: ['owner', 'group', 'participants', 'participants.user'],
            order: { createdAt: 'DESC' }
        })

        const recommendedRooms = []

        for (const room of rooms) {
            // Get room details in the same format as getRoomByGroupId
            const roomDetails = await this.getRoomByGroupId(room.groupId)

            // Add roomAvatarUrl to the response
            if (roomDetails) {
                roomDetails.roomAvatarUrl = room.roomAvatarUrl || null
                recommendedRooms.push(roomDetails)
            }
        }

        return recommendedRooms
    }
}
