import {
    BadRequestException,
    Injectable,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RoomParticipant } from '../room/entities/room-participant.entity'
import { User } from '../user/entities/user.entity'
import { GiftTransaction } from './entities/gift-transaction.entity'
import { Gift } from './entities/gift.entity'

@Injectable()
export class GiftService {
    constructor(
        @InjectRepository(Gift)
        private giftRepository: Repository<Gift>,
        @InjectRepository(GiftTransaction)
        private transactionRepository: Repository<GiftTransaction>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(RoomParticipant)
        private participantRepository: Repository<RoomParticipant>
    ) {}

    async getAllGifts() {
        return await this.giftRepository.find({
            where: { isActive: true },
            order: { category: 'ASC', price: 'ASC' }
        })
    }

    async findAll() {
        return await this.giftRepository.find({
            where: { isActive: true },
            order: { category: 'ASC', price: 'ASC' }
        })
    }

    async findOne(giftId: string) {
        const gift = await this.giftRepository.findOne({
            where: { uuid: giftId, isActive: true }
        })

        if (!gift) {
            throw new NotFoundException(`Gift with ID ${giftId} not found`)
        }

        return gift
    }

    async sendGift(
        senderId: string,
        receiverId: string,
        giftId: string,
        roomId?: string,
        message?: string
    ) {
        // Check if user is sending gift to self
        if (senderId === receiverId) {
            throw new BadRequestException('You cannot send a gift to yourself')
        }

        // Get gift info
        const gift = await this.findOne(giftId)
        if (!gift) {
            throw new NotFoundException(`Gift with ID ${giftId} not found`)
        }

        // Check if receiver exists
        const receiver = await this.userRepository.findOne({
            where: { uuid: receiverId }
        })
        if (!receiver) {
            throw new NotFoundException(
                `Receiver with ID ${receiverId} not found`
            )
        }

        // If roomId is provided, verify both users are in the room
        if (roomId) {
            const senderInRoom = await this.participantRepository.findOne({
                where: { roomId, userId: senderId }
            })

            const receiverInRoom = await this.participantRepository.findOne({
                where: { roomId, userId: receiverId }
            })

            if (!senderInRoom || !receiverInRoom) {
                throw new BadRequestException(
                    'Both sender and receiver must be in the room to send a gift'
                )
            }
        }

        // Create transaction
        const transaction = this.transactionRepository.create({
            giftId,
            userId: senderId,
            receiverId,
            senderId,
            roomId,
            amount: gift.price,
            message
        })

        return this.transactionRepository.save(transaction)
    }

    async getReceivedGifts(userId: string) {
        return this.transactionRepository.find({
            where: { receiverId: userId },
            relations: ['gift', 'sender'],
            order: { createdAt: 'DESC' }
        })
    }

    async getSentGifts(userId: string) {
        return this.transactionRepository.find({
            where: { senderId: userId },
            relations: ['gift', 'receiver'],
            order: { createdAt: 'DESC' }
        })
    }

    async getRoomGifts(roomId: string) {
        return this.transactionRepository.find({
            where: { roomId },
            relations: ['gift', 'sender', 'receiver'],
            order: { createdAt: 'DESC' }
        })
    }
}
