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
        return {
            success: true,
            message: 'Gift categories and gifts fetched successfully',
            data: await this.giftService.getGiftCategories()
        }
    }

    @Get('category/:categoryId')
    @ApiOperation({
        summary: 'Get gifts by category',
        description: 'Returns gifts for a specific category'
    })
    @ApiParam({
        name: 'categoryId',
        description: 'Category ID (hot, activity, svip, noble)',
        example: 'hot'
    })
    async getGiftsByCategory(@Param('categoryId') categoryId: string) {
        return {
            success: true,
            message: 'Category gifts fetched successfully',
            data: await this.giftService.getGiftsByCategory(categoryId)
        }
    }

    @Post('initialize-data')
    @ApiOperation({
        summary: 'Initialize default gift categories and sample gifts',
        description:
            "Creates default categories and sample gifts if they don't exist. Also updates all gifts to use diamonds currency."
    })
    async initializeDefaultData() {
        await this.giftService.initializeDefaultData()
        // Update all existing gifts to use diamonds
        await this.giftService.updateAllGiftsToDiamonds()
        return {
            success: true,
            message:
                'Default gift data initialized successfully and all gifts updated to use diamonds'
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
    @ApiOperation({ summary: 'Send a gift to multiple users' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                giftId: {
                    type: 'string',
                    description: 'UUID of gift',
                    example: 'c93cef6c-554f-6f8b-d91d-338g5884i9i1'
                },
                receiverId: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of recipient UUIDs',
                    example: ['user1-uuid', 'user2-uuid', 'user3-uuid']
                },
                quantity: {
                    type: 'number',
                    description: 'Quantity of gifts to send',
                    example: 1,
                    minimum: 1
                },
                message: {
                    type: 'string',
                    description: 'Custom message (optional)',
                    example: 'You can do it! 🔥'
                },
                roomId: {
                    type: 'string',
                    description: 'UUID of room (optional)'
                }
            },
            required: ['giftId', 'receiverId', 'quantity']
        }
    })
    async sendGift(
        @Request() req,
        @Body()
        body: {
            giftId: string
            receiverId: string[]
            quantity: number
            message?: string
            roomId?: string
        }
    ) {
        const { giftId, receiverId, quantity, message, roomId } = body
        const result = await this.giftService.sendGift(
            req.user.uuid,
            receiverId,
            giftId,
            quantity,
            roomId,
            message
        )

        return {
            success: true,
            message: result.message,
            data: result
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
