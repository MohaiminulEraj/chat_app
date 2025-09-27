import {
    BadRequestException,
    Injectable,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { RoomParticipant } from '../room/entities/room-participant.entity'
import { User } from '../user/entities/user.entity'
import { ConversionService } from '../user/services/conversion.service'
import { ConversionType } from '../user/entities/conversion-config.entity'
import { GiftTransaction } from './entities/gift-transaction.entity'
import {
    Gift,
    GiftCategory as GiftCategoryEnum,
    CurrencyType,
    GiftRarity
} from './entities/gift.entity'
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
        private participantRepository: Repository<RoomParticipant>,
        private conversionService: ConversionService
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

        // Get sender
        const sender = await this.userRepository.findOne({
            where: { uuid: senderId }
        })

        if (!sender) {
            throw new NotFoundException('Sender not found')
        }

        // Calculate total cost in diamonds (all gifts now use diamonds)
        const totalDiamondCost = gift.price * quantity * receiverIds.length

        // Check sender has sufficient diamonds
        const senderDiamondBalance = parseFloat(
            sender.diamondBalance.toString()
        )
        if (senderDiamondBalance < totalDiamondCost) {
            throw new BadRequestException(
                `Insufficient diamond balance. You need ${totalDiamondCost} diamonds but have ${senderDiamondBalance}`
            )
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

        // Get diamond to bins conversion rate from ConversionService
        const conversionRates =
            await this.conversionService.getConversionRates()
        const diamondToBinsRate =
            conversionRates[ConversionType.DIAMOND_TO_BINS]?.rate || 2

        // Begin transaction
        const queryRunner =
            this.transactionRepository.manager.connection.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            // Deduct diamonds from sender
            await queryRunner.manager.update(
                User,
                { uuid: senderId },
                {
                    diamondBalance: senderDiamondBalance - totalDiamondCost
                }
            )

            // Create transactions and add bins to receivers
            const transactions = []
            const giftValueInDiamonds = gift.price * quantity

            for (const receiver of receivers) {
                // Calculate bins to add to receiver
                const binsToAdd = giftValueInDiamonds * diamondToBinsRate

                // Update receiver's bins balance
                await queryRunner.manager.increment(
                    User,
                    { uuid: receiver.uuid },
                    'binsBalance',
                    binsToAdd
                )

                // Create transaction record
                const transaction = queryRunner.manager.create(
                    GiftTransaction,
                    {
                        giftId: gift.uuid,
                        userId: senderId,
                        receiverId: receiver.uuid,
                        senderId,
                        roomId,
                        amount: giftValueInDiamonds, // Store in diamonds
                        quantity,
                        message,
                        metadata: {
                            binsReceived: binsToAdd,
                            conversionRate: diamondToBinsRate,
                            giftPrice: gift.price,
                            totalQuantity: quantity
                        }
                    }
                )
                transactions.push(transaction)
            }

            const savedTransactions = await queryRunner.manager.save(
                GiftTransaction,
                transactions
            )

            await queryRunner.commitTransaction()

            return {
                success: true,
                message: `Gift sent to ${receiverIds.length} recipient(s)`,
                transactions: savedTransactions,
                summary: {
                    giftName: gift.name,
                    giftImageUrl: gift.imageUrl,
                    quantity,
                    totalDiamondsSpent: totalDiamondCost,
                    binsPerReceiver: giftValueInDiamonds * diamondToBinsRate,
                    totalValue: totalDiamondCost,
                    recipientCount: receiverIds.length,
                    senderName: sender.name,
                    conversionRate: diamondToBinsRate
                }
            }
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
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
        // Create default categories
        const defaultCategories = [
            {
                name: 'Hot',
                description: 'Popular and trending gifts',
                iconUrl: 'https://example.com/icons/hot.png',
                isActive: true,
                sortOrder: 1
            },
            {
                name: 'Activity',
                description: 'Interactive and engaging gifts',
                iconUrl: 'https://example.com/icons/activity.png',
                isActive: true,
                sortOrder: 2
            },
            {
                name: 'SVIP',
                description: 'Super VIP exclusive gifts',
                iconUrl: 'https://example.com/icons/svip.png',
                isActive: true,
                sortOrder: 3
            },
            {
                name: 'Noble',
                description: 'Premium and luxurious gifts',
                iconUrl: 'https://example.com/icons/noble.png',
                isActive: true,
                sortOrder: 4
            }
        ]

        // Create categories if they don't exist
        for (const categoryData of defaultCategories) {
            const existingCategory = await this.giftCategoryRepository.findOne({
                where: { name: categoryData.name }
            })

            if (!existingCategory) {
                const category =
                    this.giftCategoryRepository.create(categoryData)
                await this.giftCategoryRepository.save(category)
            }
        }

        // Create sample gifts if none exist
        const giftCount = await this.giftRepository.count()
        if (giftCount === 0) {
            const sampleGifts = [
                {
                    name: 'Red Rose',
                    title: 'Beautiful Red Rose',
                    description: 'A symbol of love and affection',
                    category: GiftCategoryEnum.HOT,
                    price: 5,
                    currencyType: CurrencyType.DIAMONDS,
                    imageUrl: 'https://example.com/gifts/red-rose.png',
                    rarity: GiftRarity.COMMON,
                    popularity: 95,
                    isActive: true
                },
                {
                    name: 'Diamond Ring',
                    title: 'Luxury Diamond Ring',
                    description: 'The ultimate symbol of commitment',
                    category: GiftCategoryEnum.NOBLE,
                    price: 500,
                    currencyType: CurrencyType.DIAMONDS,
                    imageUrl: 'https://example.com/gifts/diamond-ring.png',
                    rarity: GiftRarity.LEGENDARY,
                    popularity: 99,
                    isActive: true
                },
                {
                    name: 'Party Hat',
                    title: 'Celebration Party Hat',
                    description: 'Perfect for celebrations',
                    category: GiftCategoryEnum.ACTIVITY,
                    price: 10,
                    currencyType: CurrencyType.DIAMONDS,
                    imageUrl: 'https://example.com/gifts/party-hat.png',
                    rarity: GiftRarity.COMMON,
                    popularity: 75,
                    isActive: true
                },
                {
                    name: 'VIP Crown',
                    title: 'Exclusive VIP Crown',
                    description: 'Only for the most special people',
                    category: GiftCategoryEnum.SVIP,
                    price: 100,
                    currencyType: CurrencyType.DIAMONDS,
                    imageUrl: 'https://example.com/gifts/vip-crown.png',
                    rarity: GiftRarity.RARE,
                    popularity: 88,
                    vipRequired: true,
                    isActive: true
                }
            ]

            for (const giftData of sampleGifts) {
                const gift = this.giftRepository.create(giftData)
                await this.giftRepository.save(gift)
            }
        }
    }

    /**
     * Update all existing gifts to use diamonds currency
     */
    async updateAllGiftsToDiamonds() {
        await this.giftRepository.update(
            { currencyType: CurrencyType.BINS },
            { currencyType: CurrencyType.DIAMONDS }
        )

        // Also update any gifts that might not have a currency type set
        await this.giftRepository
            .createQueryBuilder()
            .update(Gift)
            .set({ currencyType: CurrencyType.DIAMONDS })
            .where('currencyType IS NULL OR currencyType != :diamonds', {
                diamonds: CurrencyType.DIAMONDS
            })
            .execute()
    }
}
