import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { GroupMember } from '../group/entities/group-member.entity'
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
        @InjectRepository(RoomRoleAssignment)
        private roomRoleRepository: Repository<RoomRoleAssignment>
    ) {}

    async createRoom(
        groupId: string,
        data: any,
        currentUser?: any
    ): Promise<Room> {
        const room = this.roomRepository.create({
            ...data,
            groupId,
            maxSeats: data.maxParticipants || data.maxSeats || 10, // Handle both maxParticipants and maxSeats
            ownerId: currentUser?.uuid || data.ownerId
        })

        const savedRoom = await this.roomRepository.save(room)
        const finalRoom = Array.isArray(savedRoom) ? savedRoom[0] : savedRoom

        // If we have a current user, assign them as both owner and host by default
        if (currentUser?.uuid && finalRoom.uuid) {
            await this.assignRoomRole(
                finalRoom.uuid,
                currentUser.uuid,
                RoomRole.OWNER,
                currentUser.uuid
            )
            await this.assignRoomRole(
                finalRoom.uuid,
                currentUser.uuid,
                RoomRole.HOST,
                currentUser.uuid
            )
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

    async joinRoom(roomId: string, userId: string): Promise<RoomParticipant> {
        const room = await this.roomRepository.findOne({
            where: { uuid: roomId },
            relations: ['participants']
        })

        if (!room) {
            throw new NotFoundException('Room not found')
        }

        if (room.participants.length >= room.maxSeats) {
            throw new BadRequestException('Room is full')
        }

        // Check if user is already in the room
        const existingParticipant = await this.participantRepository.findOne({
            where: { roomId, userId }
        })

        if (existingParticipant) {
            throw new BadRequestException('User is already in the room')
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

        // Add as participant - no password needed
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
        await this.roomRepository.update(roomId, { ownerId: newOwnerId })
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
}
