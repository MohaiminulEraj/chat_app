import {
    Body,
    Controller,
    Get,
    Post,
    Put,
    Query,
    Request,
    UseGuards,
    BadRequestException,
    Param
} from '@nestjs/common'
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
    ApiQuery,
    ApiBody
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { CurrencyService } from '../services/currency.service'
import { CurrencyType } from '../entities/currency-config.entity'

@ApiTags('💰 Currency System')
@Controller('currency')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CurrencyController {
    constructor(private readonly currencyService: CurrencyService) {}

    @Get('balance')
    @ApiOperation({
        summary: 'Get user currency balances',
        description:
            'Get current bins and diamond balances for the authenticated user'
    })
    @ApiResponse({
        status: 200,
        description: 'Balances retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        binsBalance: { type: 'number', example: 1250.5 },
                        diamondBalance: { type: 'number', example: 125.25 }
                    }
                }
            }
        }
    })
    async getUserBalances(@Request() req: any) {
        try {
            const userId = req.user?.uuid || req.user?.id
            const balances = await this.currencyService.getUserBalances(userId)

            return {
                success: true,
                data: balances
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    @Get('balance/:userId')
    @ApiOperation({
        summary: 'Get specific user currency balances (Admin)',
        description: 'Get currency balances for any user (admin only)'
    })
    @ApiResponse({
        status: 200,
        description: 'Balances retrieved successfully'
    })
    async getSpecificUserBalances(
        @Param('userId') userId: string,
        @Request() req: any
    ) {
        try {
            // TODO: Add admin role check here
            const balances = await this.currencyService.getUserBalances(userId)

            return {
                success: true,
                data: balances
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    @Post('purchase-diamonds')
    @ApiOperation({
        summary: 'Purchase diamonds with bins',
        description: 'Convert bins to diamonds using the current exchange rate'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                binsAmount: {
                    type: 'number',
                    example: 1000,
                    description: 'Amount of bins to spend on diamonds'
                }
            },
            required: ['binsAmount']
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Diamonds purchased successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        diamondsReceived: { type: 'number', example: 100.0 },
                        binsSpent: { type: 'number', example: 1000.0 },
                        newBinsBalance: { type: 'number', example: 2500.5 },
                        newDiamondBalance: { type: 'number', example: 225.25 },
                        transactionId: {
                            type: 'string',
                            example: '123e4567-e89b-12d3-a456-426614174000'
                        }
                    }
                }
            }
        }
    })
    async purchaseDiamonds(
        @Body() body: { binsAmount: number },
        @Request() req: any
    ) {
        try {
            const userId = req.user?.uuid || req.user?.id
            const { binsAmount } = body

            if (!binsAmount || binsAmount <= 0) {
                throw new BadRequestException(
                    'Bins amount must be greater than 0'
                )
            }

            const result = await this.currencyService.purchaseDiamonds(
                userId,
                binsAmount
            )

            return {
                success: true,
                message: 'Diamonds purchased successfully',
                data: result
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    @Post('admin/add-currency')
    @ApiOperation({
        summary: 'Add currency to user (Admin)',
        description: 'Add bins or diamonds to a user account (admin only)'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                userId: {
                    type: 'string',
                    example: '456e7890-e89b-12d3-a456-426614174001'
                },
                currencyType: {
                    type: 'string',
                    enum: ['bins', 'diamond'],
                    example: 'bins'
                },
                amount: { type: 'number', example: 500.0 },
                description: { type: 'string', example: 'Admin bonus reward' }
            },
            required: ['userId', 'currencyType', 'amount', 'description']
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Currency added successfully'
    })
    async addCurrency(
        @Body()
        body: {
            userId: string
            currencyType: CurrencyType
            amount: number
            description: string
        },
        @Request() req: any
    ) {
        try {
            // TODO: Add admin role check here
            const adminUserId = req.user?.uuid || req.user?.id
            const { userId, currencyType, amount, description } = body

            if (!amount || amount <= 0) {
                throw new BadRequestException('Amount must be greater than 0')
            }

            const result = await this.currencyService.addCurrency(
                userId,
                currencyType,
                amount,
                description,
                adminUserId
            )

            return {
                success: true,
                message: 'Currency added successfully',
                data: result
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    @Get('transactions')
    @ApiOperation({
        summary: 'Get user transaction history',
        description: 'Get transaction history for the authenticated user'
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: 'number',
        example: 20,
        description: 'Number of transactions to return'
    })
    @ApiQuery({
        name: 'offset',
        required: false,
        type: 'number',
        example: 0,
        description: 'Number of transactions to skip'
    })
    @ApiQuery({
        name: 'currencyType',
        required: false,
        enum: ['bins', 'diamond'],
        description: 'Filter by currency type'
    })
    @ApiResponse({
        status: 200,
        description: 'Transaction history retrieved successfully'
    })
    async getUserTransactionHistory(
        @Request() req: any,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
        @Query('currencyType') currencyType?: CurrencyType
    ) {
        try {
            const userId = req.user?.uuid || req.user?.id
            const result = await this.currencyService.getUserTransactionHistory(
                userId,
                limit || 20,
                offset || 0,
                currencyType
            )

            return {
                success: true,
                data: result
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    @Get('config')
    @ApiOperation({
        summary: 'Get currency configuration',
        description: 'Get current currency exchange rates and settings'
    })
    @ApiResponse({
        status: 200,
        description: 'Currency configuration retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        bins: {
                            type: 'object',
                            properties: {
                                exchangeRateToUSD: {
                                    type: 'number',
                                    example: 0.01
                                },
                                minimumPurchaseAmount: {
                                    type: 'number',
                                    example: 100
                                },
                                maximumPurchaseAmount: {
                                    type: 'number',
                                    example: 10000
                                }
                            }
                        },
                        diamond: {
                            type: 'object',
                            properties: {
                                exchangeRateToUSD: {
                                    type: 'number',
                                    example: 0.1
                                },
                                binsToDiamondRate: {
                                    type: 'number',
                                    example: 10.0
                                },
                                minimumPurchaseAmount: {
                                    type: 'number',
                                    example: 1
                                },
                                maximumPurchaseAmount: {
                                    type: 'number',
                                    example: 1000
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    async getCurrencyConfig() {
        try {
            const config = await this.currencyService.getCurrencyConfig()

            return {
                success: true,
                data: config
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    @Put('admin/config')
    @ApiOperation({
        summary: 'Update currency configuration (Admin)',
        description: 'Update currency exchange rates and settings (admin only)'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                currencyType: {
                    type: 'string',
                    enum: ['bins', 'diamond'],
                    example: 'diamond'
                },
                exchangeRateToUSD: { type: 'number', example: 0.1 },
                binsToDiamondRate: { type: 'number', example: 10.0 },
                minimumPurchaseAmount: { type: 'number', example: 1 },
                maximumPurchaseAmount: { type: 'number', example: 1000 },
                isActive: { type: 'boolean', example: true },
                description: {
                    type: 'string',
                    example: 'Updated exchange rate'
                }
            },
            required: ['currencyType']
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Currency configuration updated successfully'
    })
    async updateCurrencyConfig(@Request() req: any, @Body() configData: any) {
        try {
            // TODO: Add admin role check here
            const adminUserId = req.user?.uuid || req.user?.id
            const { currencyType, ...config } = configData

            const updatedConfig =
                await this.currencyService.updateCurrencyConfig(
                    currencyType,
                    config,
                    adminUserId
                )

            return {
                success: true,
                message: 'Currency configuration updated successfully',
                data: {
                    currencyType: updatedConfig.currencyType,
                    exchangeRateToUSD: parseFloat(
                        updatedConfig.exchangeRateToUSD.toString()
                    ),
                    binsToDiamondRate: parseFloat(
                        updatedConfig.binsToDiamondRate.toString()
                    ),
                    isActive: updatedConfig.isActive,
                    lastUpdatedAt: updatedConfig.lastUpdatedAt
                }
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }
}
