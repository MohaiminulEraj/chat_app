import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Request,
    UseGuards
} from '@nestjs/common'
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiTags
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { GiftService } from './gift.service'

@ApiTags('🎁 Gifts')
@Controller('gifts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GiftController {
    constructor(private readonly giftService: GiftService) {}

    @Get()
    @ApiOperation({ summary: 'Get all gifts (legacy)' })
    async findAll() {
        return {
            message: 'Gifts fetched successfully',
            data: await this.giftService.getAllGifts()
        }
    }

    @Get('categories')
    @ApiOperation({
        summary: 'Get all gift categories with gifts',
        description:
            'Returns categorized gifts with dual currency support (bins/diamonds)'
    })
    async getGiftCategories() {
        // TODO: Replace with actual database implementation
        return {
            success: true,
            message: 'Gift categories and gifts fetched successfully',
            data: {
                categories: [
                    {
                        id: 'hot',
                        name: 'Hot',
                        description: 'Popular and trending gifts',
                        iconUrl:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/categories/hot-icon.png',
                        isActive: true,
                        sortOrder: 1
                    },
                    {
                        id: 'activity',
                        name: 'Activity',
                        description: 'Interactive and engaging gifts',
                        iconUrl:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/categories/activity-icon.png',
                        isActive: true,
                        sortOrder: 2
                    },
                    {
                        id: 'svip',
                        name: 'SVIP',
                        description: 'Super VIP exclusive gifts',
                        iconUrl:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/categories/svip-icon.png',
                        isActive: true,
                        sortOrder: 3
                    },
                    {
                        id: 'noble',
                        name: 'Noble',
                        description: 'Premium and luxurious gifts',
                        iconUrl:
                            'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/categories/noble-icon.png',
                        isActive: true,
                        sortOrder: 4
                    }
                ],
                gifts: {
                    hot: [
                        {
                            id: 'gift_hot_001',
                            name: 'Red Rose',
                            title: 'Beautiful Red Rose',
                            description: 'A symbol of love and affection',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/hot/red-rose.png',
                            category: 'hot',
                            price: {
                                currency: 'bins',
                                amount: 50
                            },
                            effects: {
                                animation: 'rose_bloom',
                                duration: 3000,
                                sound: 'romantic_chime'
                            },
                            isActive: true,
                            rarity: 'common',
                            popularity: 95
                        },
                        {
                            id: 'gift_hot_002',
                            name: 'Heart Balloon',
                            title: 'Flying Heart Balloon',
                            description:
                                'Colorful heart balloon that floats across the screen',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/hot/heart-balloon.png',
                            category: 'hot',
                            price: {
                                currency: 'bins',
                                amount: 120
                            },
                            effects: {
                                animation: 'balloon_float',
                                duration: 5000,
                                sound: 'balloon_pop'
                            },
                            isActive: true,
                            rarity: 'common',
                            popularity: 88
                        },
                        {
                            id: 'gift_hot_003',
                            name: 'Fireworks',
                            title: 'Celebration Fireworks',
                            description: 'Spectacular fireworks display',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/hot/fireworks.png',
                            category: 'hot',
                            price: {
                                currency: 'diamonds',
                                amount: 5
                            },
                            effects: {
                                animation: 'fireworks_burst',
                                duration: 8000,
                                sound: 'fireworks_boom'
                            },
                            isActive: true,
                            rarity: 'rare',
                            popularity: 92
                        },
                        {
                            id: 'gift_hot_004',
                            name: 'Love Potion',
                            title: 'Magical Love Potion',
                            description: 'A magical potion that spreads love',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/hot/love-potion.png',
                            category: 'hot',
                            price: {
                                currency: 'bins',
                                amount: 200
                            },
                            effects: {
                                animation: 'potion_sparkle',
                                duration: 6000,
                                sound: 'magic_chime'
                            },
                            isActive: true,
                            rarity: 'uncommon',
                            popularity: 76
                        }
                    ],
                    activity: [
                        {
                            id: 'gift_activity_001',
                            name: 'Microphone',
                            title: 'Golden Microphone',
                            description: 'Perfect for karaoke sessions',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/activity/microphone.png',
                            category: 'activity',
                            price: {
                                currency: 'bins',
                                amount: 300
                            },
                            effects: {
                                animation: 'mic_glow',
                                duration: 4000,
                                sound: 'mic_feedback'
                            },
                            isActive: true,
                            rarity: 'uncommon',
                            popularity: 84
                        },
                        {
                            id: 'gift_activity_002',
                            name: 'Dance Floor',
                            title: 'Disco Dance Floor',
                            description: 'Light up the dance floor',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/activity/dance-floor.png',
                            category: 'activity',
                            price: {
                                currency: 'diamonds',
                                amount: 8
                            },
                            effects: {
                                animation: 'disco_lights',
                                duration: 10000,
                                sound: 'disco_music'
                            },
                            isActive: true,
                            rarity: 'rare',
                            popularity: 79
                        },
                        {
                            id: 'gift_activity_003',
                            name: 'Party Hat',
                            title: 'Celebration Party Hat',
                            description: 'Perfect for any celebration',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/activity/party-hat.png',
                            category: 'activity',
                            price: {
                                currency: 'bins',
                                amount: 150
                            },
                            effects: {
                                animation: 'confetti_burst',
                                duration: 5000,
                                sound: 'party_horn'
                            },
                            isActive: true,
                            rarity: 'common',
                            popularity: 71
                        },
                        {
                            id: 'gift_activity_004',
                            name: 'Gaming Console',
                            title: 'Retro Gaming Console',
                            description: 'For the gaming enthusiasts',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/activity/gaming-console.png',
                            category: 'activity',
                            price: {
                                currency: 'diamonds',
                                amount: 12
                            },
                            effects: {
                                animation: 'pixel_rain',
                                duration: 7000,
                                sound: '8bit_music'
                            },
                            isActive: true,
                            rarity: 'rare',
                            popularity: 86
                        }
                    ],
                    svip: [
                        {
                            id: 'gift_svip_001',
                            name: 'Golden Crown',
                            title: 'Majestic Golden Crown',
                            description: 'Symbol of royalty and power',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/svip/golden-crown.png',
                            category: 'svip',
                            price: {
                                currency: 'diamonds',
                                amount: 50
                            },
                            effects: {
                                animation: 'crown_shine',
                                duration: 12000,
                                sound: 'royal_fanfare'
                            },
                            isActive: true,
                            rarity: 'legendary',
                            popularity: 94,
                            requiredLevel: 10,
                            vipRequired: true
                        },
                        {
                            id: 'gift_svip_002',
                            name: 'Diamond Ring',
                            title: 'Sparkling Diamond Ring',
                            description: 'A ring that sparkles like stars',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/svip/diamond-ring.png',
                            category: 'svip',
                            price: {
                                currency: 'diamonds',
                                amount: 75
                            },
                            effects: {
                                animation: 'diamond_sparkle',
                                duration: 15000,
                                sound: 'crystal_chime'
                            },
                            isActive: true,
                            rarity: 'legendary',
                            popularity: 89,
                            requiredLevel: 15,
                            vipRequired: true
                        },
                        {
                            id: 'gift_svip_003',
                            name: 'Phoenix Feather',
                            title: 'Legendary Phoenix Feather',
                            description: 'A feather from the mythical phoenix',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/svip/phoenix-feather.png',
                            category: 'svip',
                            price: {
                                currency: 'diamonds',
                                amount: 100
                            },
                            effects: {
                                animation: 'phoenix_flight',
                                duration: 20000,
                                sound: 'phoenix_cry'
                            },
                            isActive: true,
                            rarity: 'mythical',
                            popularity: 91,
                            requiredLevel: 20,
                            vipRequired: true
                        }
                    ],
                    noble: [
                        {
                            id: 'gift_noble_001',
                            name: 'Royal Scepter',
                            title: 'Ancient Royal Scepter',
                            description: 'A scepter of ancient kings',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/noble/royal-scepter.png',
                            category: 'noble',
                            price: {
                                currency: 'diamonds',
                                amount: 200
                            },
                            effects: {
                                animation: 'scepter_power',
                                duration: 25000,
                                sound: 'ancient_power'
                            },
                            isActive: true,
                            rarity: 'mythical',
                            popularity: 87,
                            requiredLevel: 25,
                            vipRequired: true,
                            specialRequirements: ['noble_status']
                        },
                        {
                            id: 'gift_noble_002',
                            name: "Dragon's Heart",
                            title: "Eternal Dragon's Heart",
                            description: 'The heart of an ancient dragon',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/noble/dragon-heart.png',
                            category: 'noble',
                            price: {
                                currency: 'diamonds',
                                amount: 500
                            },
                            effects: {
                                animation: 'dragon_flame',
                                duration: 30000,
                                sound: 'dragon_roar'
                            },
                            isActive: true,
                            rarity: 'divine',
                            popularity: 96,
                            requiredLevel: 30,
                            vipRequired: true,
                            specialRequirements: [
                                'noble_status',
                                'dragon_guild_member'
                            ]
                        },
                        {
                            id: 'gift_noble_003',
                            name: 'Unicorn Horn',
                            title: 'Pure Unicorn Horn',
                            description: 'Horn of the last unicorn',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/noble/unicorn-horn.png',
                            category: 'noble',
                            price: {
                                currency: 'diamonds',
                                amount: 300
                            },
                            effects: {
                                animation: 'unicorn_magic',
                                duration: 28000,
                                sound: 'magical_melody'
                            },
                            isActive: true,
                            rarity: 'divine',
                            popularity: 83,
                            requiredLevel: 28,
                            vipRequired: true,
                            specialRequirements: ['noble_status']
                        },
                        {
                            id: 'gift_noble_004',
                            name: 'Galaxy Portal',
                            title: 'Cosmic Galaxy Portal',
                            description: 'A portal to distant galaxies',
                            giftImage:
                                'https://res.cloudinary.com/demo/image/upload/v1640123456/gifts/noble/galaxy-portal.png',
                            category: 'noble',
                            price: {
                                currency: 'diamonds',
                                amount: 1000
                            },
                            effects: {
                                animation: 'galaxy_swirl',
                                duration: 35000,
                                sound: 'cosmic_winds'
                            },
                            isActive: true,
                            rarity: 'cosmic',
                            popularity: 99,
                            requiredLevel: 50,
                            vipRequired: true,
                            specialRequirements: [
                                'noble_status',
                                'cosmic_achievement'
                            ]
                        }
                    ]
                },
                summary: {
                    totalCategories: 4,
                    totalGifts: 15,
                    currencyTypes: ['bins', 'diamonds'],
                    priceRange: {
                        bins: {
                            min: 50,
                            max: 300
                        },
                        diamonds: {
                            min: 5,
                            max: 1000
                        }
                    },
                    rarityLevels: [
                        'common',
                        'uncommon',
                        'rare',
                        'legendary',
                        'mythical',
                        'divine',
                        'cosmic'
                    ]
                }
            }
        }
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get gift by ID' })
    @ApiParam({ name: 'id', description: 'Gift UUID' })
    async findOne(@Param('id') id: string) {
        return {
            message: 'Gift fetched successfully',
            data: await this.giftService.findOne(id)
        }
    }

    @Post('send')
    @ApiOperation({ summary: 'Send a gift to user' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                receiverId: {
                    type: 'string',
                    description: 'UUID of recipient'
                },
                giftId: { type: 'string', description: 'UUID of gift' },
                roomId: {
                    type: 'string',
                    description: 'UUID of room (optional)'
                },
                message: {
                    type: 'string',
                    description: 'Custom message (optional)'
                }
            },
            required: ['receiverId', 'giftId']
        }
    })
    async sendGift(
        @Request() req,
        @Body()
        body: {
            receiverId: string
            giftId: string
            roomId?: string
            message?: string
        }
    ) {
        const { receiverId, giftId, roomId, message } = body
        return {
            message: 'Gift sent successfully',
            data: await this.giftService.sendGift(
                req.user.uuid,
                receiverId,
                giftId,
                roomId,
                message
            )
        }
    }

    @Get('received')
    @ApiOperation({ summary: 'Get gifts received by current user' })
    async getReceivedGifts(@Request() req) {
        return {
            message: 'Received gifts fetched successfully',
            data: await this.giftService.getReceivedGifts(req.user.uuid)
        }
    }

    @Get('sent')
    @ApiOperation({ summary: 'Get gifts sent by current user' })
    async getSentGifts(@Request() req) {
        return {
            message: 'Sent gifts fetched successfully',
            data: await this.giftService.getSentGifts(req.user.uuid)
        }
    }
}
