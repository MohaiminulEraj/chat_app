import {
    BadRequestException,
    Injectable,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { RoomParticipant } from '../room/entities/room-participant.entity'
import { User } from '../user/entities/user.entity'
import { GiftTransaction } from './entities/gift-transaction.entity'
import { Gift, GiftCategory as GiftCategoryEnum } from './entities/gift.entity'
import { GiftCategory } from './entities/gift-category.entity'

@Injectable()
export class GiftService {
    constructor(
        @InjectRepository(Gift)
        private giftRepository: Repository<Gift>,
        @InjectRepository(GiftCategory)
        private giftCategoryRepository: Repository<GiftCategory>,
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
        receiverIds: string[],
        giftId: string,
        quantity: number = 1,
        roomId?: string,
        message?: string
    ) {
        // Validate input
        if (!receiverIds || receiverIds.length === 0) {
            throw new BadRequestException(
                'At least one receiver ID is required'
            )
        }

        if (quantity <= 0) {
            throw new BadRequestException('Quantity must be greater than 0')
        }

        // Check if user is sending gift to self
        if (receiverIds.includes(senderId)) {
            throw new BadRequestException('You cannot send a gift to yourself')
        }

        // Get gift info
        const gift = await this.findOne(giftId)
        if (!gift) {
            throw new NotFoundException(`Gift with ID ${giftId} not found`)
        }

        // Validate all receivers exist
        const receivers = await this.userRepository.find({
            where: { uuid: In(receiverIds) }
        })

        if (receivers.length !== receiverIds.length) {
            const foundIds = receivers.map((r) => r.uuid)
            const notFoundIds = receiverIds.filter(
                (id) => !foundIds.includes(id)
            )
            throw new NotFoundException(
                `Receivers not found: ${notFoundIds.join(', ')}`
            )
        }

        // If roomId is provided, verify sender and all receivers are in the room
        if (roomId) {
            const senderInRoom = await this.participantRepository.findOne({
                where: { roomId, userId: senderId }
            })

            if (!senderInRoom) {
                throw new BadRequestException(
                    'Sender must be in the room to send a gift'
                )
            }

            const receiversInRoom = await this.participantRepository.find({
                where: { roomId, userId: In(receiverIds) }
            })

            if (receiversInRoom.length !== receiverIds.length) {
                const foundUserIds = receiversInRoom.map((p) => p.userId)
                const notInRoom = receiverIds.filter(
                    (id) => !foundUserIds.includes(id)
                )
                throw new BadRequestException(
                    `All receivers must be in the room. Users not in room: ${notInRoom.join(', ')}`
                )
            }
        }

        // Create transactions for each receiver
        const transactions = []
        const totalAmount = gift.price * quantity

        for (const receiverId of receiverIds) {
            const transaction = this.transactionRepository.create({
                giftId,
                userId: senderId,
                receiverId,
                senderId,
                roomId,
                amount: totalAmount,
                quantity,
                message
            })
            transactions.push(transaction)
        }

        const savedTransactions =
            await this.transactionRepository.save(transactions)

        return {
            success: true,
            message: `Gift sent to ${receiverIds.length} recipient(s)`,
            transactions: savedTransactions,
            summary: {
                giftName: gift.name,
                giftImageUrl: gift.imageUrl,
                quantity,
                totalValue: totalAmount * receiverIds.length,
                recipientCount: receiverIds.length,
                senderName: (
                    await this.userRepository.findOne({
                        where: { uuid: senderId }
                    })
                )?.name
            }
        }
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

    /**
     * Get all gift categories with their gifts
     */
    async getGiftCategories() {
        // Get all categories
        const categories = await this.giftCategoryRepository.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC', name: 'ASC' }
        })

        // Get all active gifts
        const gifts = await this.giftRepository.find({
            where: { isActive: true },
            order: { category: 'ASC', sortOrder: 'ASC', popularity: 'DESC' }
        })

        // Group gifts by category
        const giftsByCategory = gifts.reduce((acc, gift) => {
            const categoryKey = gift.category.toLowerCase()
            if (!acc[categoryKey]) {
                acc[categoryKey] = []
            }

            // Transform gift data to match expected format
            acc[categoryKey].push({
                id: gift.uuid,
                name: gift.name,
                title: gift.title || gift.name,
                description: gift.description,
                giftImage: gift.giftImage || gift.imageUrl,
                category: gift.category,
                price: {
                    currency: gift.currencyType,
                    amount: parseFloat(gift.price.toString())
                },
                effects: gift.effects || {
                    animation: 'default_animation',
                    duration: 3000,
                    sound: 'default_chime'
                },
                isActive: gift.isActive,
                rarity: gift.rarity,
                popularity: gift.popularity,
                ...(gift.requiredLevel > 0 && {
                    requiredLevel: gift.requiredLevel
                }),
                ...(gift.vipRequired && { vipRequired: gift.vipRequired }),
                ...(gift.specialRequirements &&
                    gift.specialRequirements.length > 0 && {
                        specialRequirements: gift.specialRequirements
                    })
            })
            return acc
        }, {})

        // Transform categories to match expected format
        const transformedCategories = categories.map((category) => ({
            id: category.categoryId,
            name: category.name,
            description: category.description,
            iconUrl: category.iconUrl,
            isActive: category.isActive,
            sortOrder: category.sortOrder
        }))

        // Calculate summary statistics
        const totalGifts = gifts.length
        const currencyTypes = [
            ...new Set(gifts.map((gift) => gift.currencyType))
        ]

        const binsGifts = gifts.filter((g) => g.currencyType === 'bins')
        const diamondGifts = gifts.filter((g) => g.currencyType === 'diamonds')

        const priceRange = {
            bins:
                binsGifts.length > 0
                    ? {
                          min: Math.min(
                              ...binsGifts.map((g) =>
                                  parseFloat(g.price.toString())
                              )
                          ),
                          max: Math.max(
                              ...binsGifts.map((g) =>
                                  parseFloat(g.price.toString())
                              )
                          )
                      }
                    : null,
            diamonds:
                diamondGifts.length > 0
                    ? {
                          min: Math.min(
                              ...diamondGifts.map((g) =>
                                  parseFloat(g.price.toString())
                              )
                          ),
                          max: Math.max(
                              ...diamondGifts.map((g) =>
                                  parseFloat(g.price.toString())
                              )
                          )
                      }
                    : null
        }

        const rarityLevels = [
            ...new Set(gifts.map((gift) => gift.rarity))
        ].sort()

        return {
            categories: transformedCategories,
            gifts: giftsByCategory,
            summary: {
                totalCategories: categories.length,
                totalGifts,
                currencyTypes,
                priceRange,
                rarityLevels
            }
        }
    }

    /**
     * Get gifts by category
     */
    async getGiftsByCategory(categoryId: string) {
        const gifts = await this.giftRepository.find({
            where: {
                category: categoryId.toUpperCase() as GiftCategoryEnum,
                isActive: true
            },
            order: { sortOrder: 'ASC', popularity: 'DESC' }
        })

        return gifts.map((gift) => ({
            id: gift.uuid,
            name: gift.name,
            title: gift.title || gift.name,
            description: gift.description,
            giftImage: gift.giftImage || gift.imageUrl,
            category: gift.category,
            price: {
                currency: gift.currencyType,
                amount: parseFloat(gift.price.toString())
            },
            effects: gift.effects || {
                animation: 'default_animation',
                duration: 3000,
                sound: 'default_chime'
            },
            isActive: gift.isActive,
            rarity: gift.rarity,
            popularity: gift.popularity,
            ...(gift.requiredLevel > 0 && {
                requiredLevel: gift.requiredLevel
            }),
            ...(gift.vipRequired && { vipRequired: gift.vipRequired }),
            ...(gift.specialRequirements &&
                gift.specialRequirements.length > 0 && {
                    specialRequirements: gift.specialRequirements
                })
        }))
    }

    /**
     * Initialize default categories and sample gifts
     */
    async initializeDefaultData() {
        // Check if categories exist
        const existingCategories = await this.giftCategoryRepository.count()

        if (existingCategories === 0) {
            // Create default categories using repository.create to ensure proper entity instances
            const defaultCategories = this.giftCategoryRepository.create([
                {
                    categoryId: 'hot',
                    name: 'Hot',
                    description: 'Popular and trending gifts',
                    iconUrl:
                        'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/categories/hot-icon.png',
                    sortOrder: 1
                },
                {
                    categoryId: 'activity',
                    name: 'Activity',
                    description: 'Interactive and engaging gifts',
                    iconUrl:
                        'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/categories/activity-icon.png',
                    sortOrder: 2
                },
                {
                    categoryId: 'svip',
                    name: 'SVIP',
                    description: 'Super VIP exclusive gifts',
                    iconUrl:
                        'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/categories/svip-icon.png',
                    sortOrder: 3
                },
                {
                    categoryId: 'noble',
                    name: 'Noble',
                    description: 'Premium and luxurious gifts',
                    iconUrl:
                        'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/categories/noble-icon.png',
                    sortOrder: 4
                }
            ])

            await this.giftCategoryRepository.save(defaultCategories)
        }

        // Check if gifts exist
        const existingGifts = await this.giftRepository.count()

        if (existingGifts === 0) {
            // Create sample gifts
            const sampleGifts = [
                // Hot category
                {
                    name: 'Red Rose',
                    title: 'Beautiful Red Rose',
                    description: 'A symbol of love and affection',
                    giftImage:
                        'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/hot/red-rose.png',
                    category: GiftCategoryEnum.HOT,
                    price: 50,
                    currencyType: 'bins',
                    rarity: 'common',
                    popularity: 95,
                    effects: {
                        animation: 'rose_bloom',
                        duration: 3000,
                        sound: 'romantic_chime'
                    }
                },
                {
                    name: 'Heart Balloon',
                    title: 'Flying Heart Balloon',
                    description:
                        'Colorful heart balloon that floats across the screen',
                    giftImage:
                        'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/hot/heart-balloon.png',
                    category: GiftCategoryEnum.HOT,
                    price: 120,
                    currencyType: 'bins',
                    rarity: 'common',
                    popularity: 88,
                    effects: {
                        animation: 'balloon_float',
                        duration: 5000,
                        sound: 'balloon_pop'
                    }
                },
                {
                    name: 'Fireworks',
                    title: 'Celebration Fireworks',
                    description: 'Spectacular fireworks display',
                    giftImage:
                        'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/hot/fireworks.png',
                    category: GiftCategoryEnum.HOT,
                    price: 5,
                    currencyType: 'diamonds',
                    rarity: 'rare',
                    popularity: 92,
                    effects: {
                        animation: 'fireworks_burst',
                        duration: 8000,
                        sound: 'fireworks_boom'
                    }
                }
                // Add more sample gifts as needed...
            ]

            const giftEntities = this.giftRepository.create(sampleGifts as any)
            await this.giftRepository.save(giftEntities)
        }
    }
}
