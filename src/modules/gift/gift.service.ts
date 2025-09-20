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
     * Prevents duplication by checking existing data per category
     */
    async initializeDefaultData() {
        let addedCategories = 0
        let addedGifts = 0
        let skippedCategories = []
        let addedGiftsByCategory = {}

        // Check existing gift counts by category
        const existingGiftCounts = {
            hot: await this.giftRepository.count({
                where: { category: GiftCategoryEnum.HOT }
            }),
            activity: await this.giftRepository.count({
                where: { category: GiftCategoryEnum.ACTIVITY }
            }),
            svip: await this.giftRepository.count({
                where: { category: GiftCategoryEnum.SVIP }
            }),
            noble: await this.giftRepository.count({
                where: { category: GiftCategoryEnum.NOBLE }
            })
        }

        // Check if categories exist, create if missing
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
            addedCategories = 4
        }

        // Now add gifts for each category that doesn't have enough sample data
        const categoriesToProcess = [
            {
                name: 'hot',
                enum: GiftCategoryEnum.HOT,
                gifts: [
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
                        sortOrder: 1,
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
                        sortOrder: 2,
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
                        sortOrder: 3,
                        effects: {
                            animation: 'fireworks_burst',
                            duration: 8000,
                            sound: 'fireworks_boom'
                        }
                    },
                    {
                        name: 'Love Potion',
                        title: 'Magical Love Potion',
                        description: 'A magical potion that spreads love',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/hot/love-potion.png',
                        category: GiftCategoryEnum.HOT,
                        price: 200,
                        currencyType: 'bins',
                        rarity: 'uncommon',
                        popularity: 76,
                        sortOrder: 4,
                        effects: {
                            animation: 'potion_sparkle',
                            duration: 6000,
                            sound: 'magic_chime'
                        }
                    }
                ]
            },
            {
                name: 'activity',
                enum: GiftCategoryEnum.ACTIVITY,
                gifts: [
                    {
                        name: 'Microphone',
                        title: 'Golden Microphone',
                        description: 'Perfect for karaoke sessions',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/activity/microphone.png',
                        category: GiftCategoryEnum.ACTIVITY,
                        price: 300,
                        currencyType: 'bins',
                        rarity: 'uncommon',
                        popularity: 84,
                        sortOrder: 1,
                        effects: {
                            animation: 'mic_glow',
                            duration: 4000,
                            sound: 'mic_feedback'
                        }
                    },
                    {
                        name: 'Dance Floor',
                        title: 'Disco Dance Floor',
                        description: 'Light up the dance floor',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/activity/dance-floor.png',
                        category: GiftCategoryEnum.ACTIVITY,
                        price: 8,
                        currencyType: 'diamonds',
                        rarity: 'rare',
                        popularity: 79,
                        sortOrder: 2,
                        effects: {
                            animation: 'disco_lights',
                            duration: 10000,
                            sound: 'disco_music'
                        }
                    },
                    {
                        name: 'Party Hat',
                        title: 'Celebration Party Hat',
                        description: 'Perfect for any celebration',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/activity/party-hat.png',
                        category: GiftCategoryEnum.ACTIVITY,
                        price: 150,
                        currencyType: 'bins',
                        rarity: 'common',
                        popularity: 71,
                        sortOrder: 3,
                        effects: {
                            animation: 'confetti_burst',
                            duration: 5000,
                            sound: 'party_horn'
                        }
                    },
                    {
                        name: 'Gaming Console',
                        title: 'Retro Gaming Console',
                        description: 'For the gaming enthusiasts',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/activity/gaming-console.png',
                        category: GiftCategoryEnum.ACTIVITY,
                        price: 12,
                        currencyType: 'diamonds',
                        rarity: 'rare',
                        popularity: 86,
                        sortOrder: 4,
                        effects: {
                            animation: 'pixel_rain',
                            duration: 7000,
                            sound: '8bit_music'
                        }
                    },
                    {
                        name: 'Sports Trophy',
                        title: 'Championship Trophy',
                        description: 'Winner takes it all',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/activity/trophy.png',
                        category: GiftCategoryEnum.ACTIVITY,
                        price: 450,
                        currencyType: 'bins',
                        rarity: 'rare',
                        popularity: 82,
                        sortOrder: 5,
                        effects: {
                            animation: 'trophy_shine',
                            duration: 6000,
                            sound: 'victory_fanfare'
                        }
                    }
                ]
            },
            {
                name: 'svip',
                enum: GiftCategoryEnum.SVIP,
                gifts: [
                    {
                        name: 'Golden Crown',
                        title: 'Majestic Golden Crown',
                        description: 'Symbol of royalty and power',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/svip/golden-crown.png',
                        category: GiftCategoryEnum.SVIP,
                        price: 50,
                        currencyType: 'diamonds',
                        rarity: 'legendary',
                        popularity: 94,
                        requiredLevel: 10,
                        vipRequired: true,
                        sortOrder: 1,
                        effects: {
                            animation: 'crown_shine',
                            duration: 12000,
                            sound: 'royal_fanfare'
                        }
                    },
                    {
                        name: 'Diamond Ring',
                        title: 'Sparkling Diamond Ring',
                        description: 'A ring that sparkles like stars',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/svip/diamond-ring.png',
                        category: GiftCategoryEnum.SVIP,
                        price: 75,
                        currencyType: 'diamonds',
                        rarity: 'legendary',
                        popularity: 89,
                        requiredLevel: 15,
                        vipRequired: true,
                        sortOrder: 2,
                        effects: {
                            animation: 'diamond_sparkle',
                            duration: 15000,
                            sound: 'crystal_chime'
                        }
                    },
                    {
                        name: 'Phoenix Feather',
                        title: 'Legendary Phoenix Feather',
                        description: 'A feather from the mythical phoenix',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/svip/phoenix-feather.png',
                        category: GiftCategoryEnum.SVIP,
                        price: 100,
                        currencyType: 'diamonds',
                        rarity: 'mythical',
                        popularity: 91,
                        requiredLevel: 20,
                        vipRequired: true,
                        sortOrder: 3,
                        effects: {
                            animation: 'phoenix_flight',
                            duration: 20000,
                            sound: 'phoenix_cry'
                        }
                    },
                    {
                        name: 'Crystal Palace',
                        title: 'Enchanted Crystal Palace',
                        description: 'A palace made of pure crystal',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/svip/crystal-palace.png',
                        category: GiftCategoryEnum.SVIP,
                        price: 150,
                        currencyType: 'diamonds',
                        rarity: 'mythical',
                        popularity: 87,
                        requiredLevel: 25,
                        vipRequired: true,
                        sortOrder: 4,
                        effects: {
                            animation: 'crystal_palace_rise',
                            duration: 18000,
                            sound: 'crystal_harmony'
                        }
                    }
                ]
            },
            {
                name: 'noble',
                enum: GiftCategoryEnum.NOBLE,
                gifts: [
                    {
                        name: 'Royal Scepter',
                        title: 'Ancient Royal Scepter',
                        description: 'A scepter of ancient kings',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/noble/royal-scepter.png',
                        category: GiftCategoryEnum.NOBLE,
                        price: 200,
                        currencyType: 'diamonds',
                        rarity: 'mythical',
                        popularity: 87,
                        requiredLevel: 25,
                        vipRequired: true,
                        specialRequirements: ['noble_status'],
                        sortOrder: 1,
                        effects: {
                            animation: 'scepter_power',
                            duration: 25000,
                            sound: 'ancient_power'
                        }
                    },
                    {
                        name: "Dragon's Heart",
                        title: "Eternal Dragon's Heart",
                        description: 'The heart of an ancient dragon',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/noble/dragon-heart.png',
                        category: GiftCategoryEnum.NOBLE,
                        price: 500,
                        currencyType: 'diamonds',
                        rarity: 'divine',
                        popularity: 96,
                        requiredLevel: 30,
                        vipRequired: true,
                        specialRequirements: [
                            'noble_status',
                            'dragon_guild_member'
                        ],
                        sortOrder: 2,
                        effects: {
                            animation: 'dragon_flame',
                            duration: 30000,
                            sound: 'dragon_roar'
                        }
                    },
                    {
                        name: 'Unicorn Horn',
                        title: 'Pure Unicorn Horn',
                        description: 'Horn of the last unicorn',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/noble/unicorn-horn.png',
                        category: GiftCategoryEnum.NOBLE,
                        price: 300,
                        currencyType: 'diamonds',
                        rarity: 'divine',
                        popularity: 83,
                        requiredLevel: 28,
                        vipRequired: true,
                        specialRequirements: ['noble_status'],
                        sortOrder: 3,
                        effects: {
                            animation: 'unicorn_magic',
                            duration: 28000,
                            sound: 'magical_melody'
                        }
                    },
                    {
                        name: 'Galaxy Portal',
                        title: 'Cosmic Galaxy Portal',
                        description: 'A portal to distant galaxies',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/noble/galaxy-portal.png',
                        category: GiftCategoryEnum.NOBLE,
                        price: 1000,
                        currencyType: 'diamonds',
                        rarity: 'cosmic',
                        popularity: 99,
                        requiredLevel: 50,
                        vipRequired: true,
                        specialRequirements: [
                            'noble_status',
                            'cosmic_achievement'
                        ],
                        sortOrder: 4,
                        effects: {
                            animation: 'galaxy_swirl',
                            duration: 35000,
                            sound: 'cosmic_winds'
                        }
                    },
                    {
                        name: 'Throne of Power',
                        title: 'Supreme Throne of Power',
                        description: 'The ultimate symbol of authority',
                        giftImage:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/noble/throne-power.png',
                        category: GiftCategoryEnum.NOBLE,
                        price: 800,
                        currencyType: 'diamonds',
                        rarity: 'cosmic',
                        popularity: 93,
                        requiredLevel: 40,
                        vipRequired: true,
                        specialRequirements: ['noble_status', 'emperor_rank'],
                        sortOrder: 5,
                        effects: {
                            animation: 'throne_ascension',
                            duration: 32000,
                            sound: 'imperial_anthem'
                        }
                    }
                ]
            }
        ]

        // Process each category
        for (const categoryData of categoriesToProcess) {
            const existingCount = existingGiftCounts[categoryData.name]

            if (existingCount === 0) {
                // Add all gifts for this category
                const giftEntities = this.giftRepository.create(
                    categoryData.gifts as any
                )
                await this.giftRepository.save(giftEntities)

                addedGifts += categoryData.gifts.length
                addedGiftsByCategory[categoryData.name] =
                    categoryData.gifts.length
            } else {
                skippedCategories.push(
                    `${categoryData.name} (${existingCount} existing)`
                )
            }
        }

        // Return detailed response
        return {
            message:
                addedGifts > 0
                    ? `Default data initialized successfully. Added ${addedGifts} gifts across ${Object.keys(addedGiftsByCategory).length} categories.`
                    : 'Default data already exists for all categories',
            initialized: addedGifts > 0,
            addedCategories,
            addedGifts,
            addedGiftsByCategory,
            skippedCategories,
            existingGiftCounts,
            finalCounts: {
                categories: await this.giftCategoryRepository.count(),
                gifts: await this.giftRepository.count()
            }
        }
    }
}
