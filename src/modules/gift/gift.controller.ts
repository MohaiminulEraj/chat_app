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
            "Creates default categories and sample gifts if they don't exist. Prevents duplication on multiple calls."
    })
    async initializeDefaultData() {
        const result = await this.giftService.initializeDefaultData()
        return {
            success: true,
            ...result
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
