import {
    Controller,
    Post,
    Get,
    Body,
    Request,
    UseGuards,
    HttpStatus,
    Put,
    Param,
    Query,
    BadRequestException
} from '@nestjs/common'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
    ApiBearerAuth,
    ApiParam,
    ApiQuery
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { ConversionService } from '../services/conversion.service'
import { ConversionType } from '../entities/conversion-config.entity'

@ApiTags('💱 Currency Conversion')
@Controller('conversion')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversionController {
    constructor(private readonly conversionService: ConversionService) {}

    @Get('rates')
    @ApiOperation({
        summary: 'Get conversion rates',
        description:
            'Get current conversion rates for all currency conversions including commission percentages'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Conversion rates retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        diamond_to_bins: {
                            type: 'object',
                            properties: {
                                sourceValue: { type: 'number', example: 1 },
                                targetValue: { type: 'number', example: 2 },
                                rate: { type: 'number', example: 2 },
                                commissionPercent: {
                                    type: 'number',
                                    example: 0
                                },
                                isActive: { type: 'boolean', example: true }
                            }
                        },
                        bins_to_diamond: {
                            type: 'object',
                            properties: {
                                sourceValue: { type: 'number', example: 3 },
                                targetValue: { type: 'number', example: 1 },
                                rate: { type: 'number', example: 0.3333 },
                                commissionPercent: {
                                    type: 'number',
                                    example: 70
                                },
                                isActive: { type: 'boolean', example: true }
                            }
                        },
                        bins_to_usd: {
                            type: 'object',
                            properties: {
                                sourceValue: { type: 'number', example: 1 },
                                targetValue: { type: 'number', example: 210 },
                                rate: { type: 'number', example: 0.0048 },
                                commissionPercent: {
                                    type: 'number',
                                    example: 0
                                },
                                isActive: { type: 'boolean', example: true }
                            }
                        }
                    }
                }
            }
        }
    })
    async getConversionRates() {
        try {
            const rates = await this.conversionService.getConversionRates()
            return {
                success: true,
                message: 'Conversion rates retrieved successfully',
                data: rates
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    @Post('bins-to-diamonds')
    @ApiOperation({
        summary: 'Convert bins to diamonds',
        description:
            'Convert bins to diamonds with admin commission deduction. Commission percentage is set by admin.'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                binsAmount: {
                    type: 'number',
                    example: 100,
                    description: 'Amount of bins to convert to diamonds'
                }
            },
            required: ['binsAmount']
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Bins converted to diamonds successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: {
                    type: 'string',
                    example: 'Conversion completed successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        diamondsReceived: {
                            type: 'number',
                            example: 10,
                            description: 'Diamonds received after commission'
                        },
                        binsSpent: { type: 'number', example: 100 },
                        commissionAmount: {
                            type: 'number',
                            example: 23.33,
                            description: 'Commission taken by admin'
                        },
                        newBinsBalance: { type: 'number', example: 400 },
                        newDiamondBalance: { type: 'number', example: 35.5 },
                        transactionId: {
                            type: 'string',
                            example: '123e4567-e89b-12d3-a456-426614174000'
                        }
                    }
                }
            }
        }
    })
    async convertBinsToDiamonds(
        @Body() body: { binsAmount: number },
        @Request() req: any
    ) {
        try {
            const userId = req.user?.uuid || req.user?.id
            const result = await this.conversionService.convertBinsToDiamonds(
                userId,
                body.binsAmount
            )

            return {
                success: true,
                message: 'Conversion completed successfully',
                data: result
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    @Post('withdrawal/request')
    @ApiOperation({
        summary: 'Request bins withdrawal to USD',
        description:
            'Request to withdraw bins balance to USD. Withdrawal needs admin approval.'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                binsAmount: {
                    type: 'number',
                    example: 2100,
                    description: 'Amount of bins to withdraw'
                },
                bankDetails: {
                    type: 'object',
                    properties: {
                        accountName: { type: 'string', example: 'John Doe' },
                        accountNumber: {
                            type: 'string',
                            example: '1234567890'
                        },
                        bankName: {
                            type: 'string',
                            example: 'Bank of America'
                        },
                        routingNumber: { type: 'string', example: '021000021' },
                        swiftCode: { type: 'string', example: 'BOFAUS3N' }
                    }
                }
            },
            required: ['binsAmount']
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Withdrawal request created successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: {
                    type: 'string',
                    example: 'Withdrawal request created successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        withdrawalRequestId: { type: 'string' },
                        binsAmount: { type: 'number', example: 2100 },
                        estimatedUSD: { type: 'number', example: 10.0 },
                        status: { type: 'string', example: 'pending' },
                        requestedAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                }
            }
        }
    })
    async requestWithdrawal(
        @Body() body: { binsAmount: number; bankDetails?: any },
        @Request() req: any
    ) {
        try {
            const userId = req.user?.uuid || req.user?.id
            const result = await this.conversionService.requestWithdrawal(
                userId,
                body.binsAmount,
                body.bankDetails
            )

            return {
                success: true,
                message: 'Withdrawal request created successfully',
                data: {
                    withdrawalRequestId: result.withdrawalRequest.uuid,
                    binsAmount: result.withdrawalRequest.sourceAmount,
                    estimatedUSD: result.estimatedUSD,
                    status: result.withdrawalRequest.status,
                    requestedAt: result.withdrawalRequest.createdAt
                }
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    @Get('history')
    @ApiOperation({
        summary: 'Get conversion history',
        description: 'Get user conversion and withdrawal history'
    })
    @ApiQuery({
        name: 'type',
        required: false,
        enum: ConversionType,
        description: 'Filter by conversion type'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Conversion history retrieved successfully'
    })
    async getConversionHistory(
        @Request() req: any,
        @Query('type') conversionType?: ConversionType
    ) {
        try {
            const userId = req.user?.uuid || req.user?.id
            const history =
                await this.conversionService.getUserConversionHistory(
                    userId,
                    conversionType
                )

            return {
                success: true,
                message: 'Conversion history retrieved successfully',
                data: history
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    // Admin endpoints
    @Put('admin/config/:type')
    @ApiOperation({
        summary: 'Update conversion configuration (Admin)',
        description: 'Update conversion rates and commission percentages'
    })
    @ApiParam({
        name: 'type',
        enum: ConversionType,
        description: 'Conversion type to update'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                sourceValue: {
                    type: 'number',
                    example: 1,
                    description: 'Source currency value'
                },
                targetValue: {
                    type: 'number',
                    example: 2,
                    description: 'Target currency value'
                },
                adminCommissionPercent: {
                    type: 'number',
                    example: 70,
                    description: 'Admin commission percentage (0-100)'
                },
                isActive: {
                    type: 'boolean',
                    example: true,
                    description: 'Enable/disable this conversion type'
                }
            }
        }
    })
    async updateConversionConfig(
        @Param('type') conversionType: ConversionType,
        @Body() config: any,
        @Request() req: any
    ) {
        try {
            // TODO: Add admin role check
            const adminUserId = req.user?.uuid || req.user?.id
            const updatedConfig =
                await this.conversionService.updateConversionConfig(
                    conversionType,
                    config,
                    adminUserId
                )

            return {
                success: true,
                message: 'Conversion configuration updated successfully',
                data: updatedConfig
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    @Post('admin/withdrawal/:id/process')
    @ApiOperation({
        summary: 'Process withdrawal request (Admin)',
        description: 'Approve or reject a withdrawal request'
    })
    @ApiParam({
        name: 'id',
        description: 'Withdrawal request ID'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                approved: {
                    type: 'boolean',
                    example: true,
                    description: 'Approve or reject the withdrawal'
                },
                notes: {
                    type: 'string',
                    example: 'Processed successfully',
                    description: 'Admin notes for the action'
                }
            },
            required: ['approved']
        }
    })
    async processWithdrawal(
        @Param('id') withdrawalId: string,
        @Body() body: { approved: boolean; notes?: string },
        @Request() req: any
    ) {
        try {
            // TODO: Add admin role check
            const adminUserId = req.user?.uuid || req.user?.id
            const result = await this.conversionService.processWithdrawal(
                withdrawalId,
                adminUserId,
                body.approved,
                body.notes
            )

            return {
                success: true,
                message: `Withdrawal ${
                    body.approved ? 'approved' : 'rejected'
                } successfully`,
                data: result
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    @Get('admin/wallet')
    @ApiOperation({
        summary: 'Get admin wallet statistics (Admin)',
        description: 'Get admin wallet balance and commission statistics'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Admin wallet statistics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        binsBalance: { type: 'number', example: 50000 },
                        diamondBalance: { type: 'number', example: 5000 },
                        usdBalance: { type: 'number', example: 238.09 },
                        totalCommissionsEarned: {
                            type: 'number',
                            example: 15000
                        },
                        statistics: {
                            type: 'object',
                            properties: {
                                totalConversions: {
                                    type: 'number',
                                    example: 1250
                                },
                                totalWithdrawals: {
                                    type: 'number',
                                    example: 85
                                },
                                averageCommissionPercent: {
                                    type: 'number',
                                    example: 68.5
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    async getAdminWalletStats(@Request() req: any) {
        try {
            // TODO: Add admin role check
            const stats = await this.conversionService.getAdminWalletStats()

            return {
                success: true,
                message: 'Admin wallet statistics retrieved successfully',
                data: stats
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    @Post('initialize')
    @ApiOperation({
        summary: 'Initialize default conversion configurations',
        description:
            'Initialize default conversion rates and configurations if not exists'
    })
    async initializeDefaults() {
        try {
            await this.conversionService.initializeDefaultConfigs()
            return {
                success: true,
                message: 'Default configurations initialized successfully'
            }
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }
}
