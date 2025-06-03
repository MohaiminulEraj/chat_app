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
        private groupMemberRepository: Repository<GroupMember>
    ) {}

    async createRoom(groupId: string, data: any): Promise<Room> {
        const room = this.roomRepository.create({
            ...data,
            groupId,
            maxSeats: data.maxSeats || 10 // Default to 10 seats if not specified
        })

        const savedRoom = await this.roomRepository.save(room)
        return Array.isArray(savedRoom) ? savedRoom[0] : savedRoom
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
}
