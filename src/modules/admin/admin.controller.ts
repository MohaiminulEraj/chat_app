import {
    Controller,
    Post,
    Get,
    Put,
    Body,
    Param,
    Query,
    Request,
    UseGuards,
    HttpStatus,
    BadRequestException
} from '@nestjs/common'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
    ApiBearerAuth,
    ApiQuery,
    ApiParam
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { AdminOnly } from '../../common/decorators/roles.decorator'
import { AdminService } from './admin.service'
import {
    CurrencyType,
    AdminTransactionType
} from '../user/entities/admin-transaction.entity'
import { ConversionType } from '../user/entities/conversion-config.entity'

@ApiTags('🔐 Admin Management')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@AdminOnly()
@ApiBearerAuth()
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Post('gift-currency')
    @ApiOperation({
        summary: 'Gift currency to user (Admin Only)',
        description:
            'Admin can gift bins or diamonds to any user with tracking'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                userId: {
                    type: 'string',
                    example: '123e4567-e89b-12d3-a456-426614174000',
                    description: 'Target user UUID'
                },
                currencyType: {
                    type: 'string',
                    enum: ['bins', 'diamonds'],
                    example: 'diamonds'
                },
                amount: {
                    type: 'number',
                    example: 100,
                    description: 'Amount to gift'
                },
                reason: {
                    type: 'string',
                    example: 'Welcome bonus',
                    description: 'Reason for the gift'
                },
                notes: {
                    type: 'string',
                    example: 'New user promotion',
                    description: 'Additional notes (optional)'
                }
            },
            required: ['userId', 'currencyType', 'amount', 'reason']
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Currency gifted successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        transactionId: { type: 'string' },
                        userId: { type: 'string' },
                        userName: { type: 'string' },
                        amount: { type: 'number' },
                        newBalance: { type: 'number' }
                    }
                }
            }
        }
    })
    async giftCurrency(
        @Request() req: any,
        @Body()
        body: {
            userId: string
            currencyType: CurrencyType
            amount: number
            reason: string
            notes?: string
        }
    ) {
        const adminId = req.user.uuid
        const result = await this.adminService.giftCurrencyToUser(
            adminId,
            body.userId,
            body.currencyType,
            body.amount,
            body.reason,
            body.notes
        )

        return {
            success: true,
            message: `Successfully gifted ${body.amount} ${body.currencyType} to user`,
            data: {
                transactionId: result.transaction.uuid,
                userId: result.user.id,
                userName: result.user.name,
                amount: body.amount,
                currencyType: body.currencyType,
                newBalance: result.user.newBalance
            }
        }
    }

    @Post('adjust-currency')
    @ApiOperation({
        summary: 'Adjust user currency (Admin Only)',
        description: 'Add or deduct currency with proper tracking and reason'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                userId: { type: 'string' },
                currencyType: {
                    type: 'string',
                    enum: ['bins', 'diamonds']
                },
                amount: {
                    type: 'number',
                    description: 'Positive to add, negative to deduct'
                },
                transactionType: {
                    type: 'string',
                    enum: ['adjustment', 'compensation', 'bonus', 'penalty']
                },
                reason: { type: 'string' },
                notes: { type: 'string' }
            },
            required: [
                'userId',
                'currencyType',
                'amount',
                'transactionType',
                'reason'
            ]
        }
    })
    async adjustCurrency(
        @Request() req: any,
        @Body()
        body: {
            userId: string
            currencyType: CurrencyType
            amount: number
            transactionType: AdminTransactionType
            reason: string
            notes?: string
        }
    ) {
        const adminId = req.user.uuid
        const result = await this.adminService.adjustUserCurrency(
            adminId,
            body.userId,
            body.currencyType,
            body.amount,
            body.transactionType,
            body.reason,
            body.notes
        )

        return {
            success: true,
            message: 'Currency adjusted successfully',
            data: result
        }
    }

    @Put('conversion-rates/:type')
    @ApiOperation({
        summary: 'Update conversion rates (Admin Only)',
        description: 'Update bins/diamond/USD conversion rates with tracking'
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
                sourceValue: { type: 'number', example: 3 },
                targetValue: { type: 'number', example: 1 },
                commissionPercent: { type: 'number', example: 70 },
                reason: { type: 'string', example: 'Market adjustment' }
            },
            required: ['sourceValue', 'targetValue']
        }
    })
    async updateConversionRate(
        @Request() req: any,
        @Param('type') conversionType: ConversionType,
        @Body()
        body: {
            sourceValue: number
            targetValue: number
            commissionPercent?: number
            reason?: string
        }
    ) {
        const adminId = req.user.uuid
        const result = await this.adminService.updateConversionRate(
            adminId,
            conversionType,
            body.sourceValue,
            body.targetValue,
            body.commissionPercent,
            body.reason
        )

        return {
            success: true,
            message: 'Conversion rate updated successfully',
            data: {
                conversionType,
                oldRate:
                    result.oldConfig.targetValue /
                    result.oldConfig.sourceValue,
                newRate:
                    result.newConfig.targetValue /
                    result.newConfig.sourceValue,
                oldSourceValue: result.oldConfig.sourceValue,
                oldTargetValue: result.oldConfig.targetValue,
                newSourceValue: result.newConfig.sourceValue,
                newTargetValue: result.newConfig.targetValue,
                transactionId: result.transaction.uuid
            }
        }
    }

    @Get('transactions')
    @ApiOperation({
        summary: 'Get admin transaction history (Admin Only)',
        description: 'View all admin transactions with filtering options'
    })
    @ApiQuery({ name: 'adminId', required: false })
    @ApiQuery({ name: 'userId', required: false })
    @ApiQuery({ name: 'type', enum: AdminTransactionType, required: false })
    @ApiQuery({ name: 'limit', type: Number, required: false })
    @ApiQuery({ name: 'offset', type: Number, required: false })
    async getTransactionHistory(
        @Query('adminId') adminId?: string,
        @Query('userId') userId?: string,
        @Query('type') transactionType?: AdminTransactionType,
        @Query('limit') limit: number = 50,
        @Query('offset') offset: number = 0
    ) {
        const result = await this.adminService.getAdminTransactionHistory(
            adminId,
            userId,
            transactionType,
            limit,
            offset
        )

        return {
            success: true,
            message: 'Transaction history retrieved',
            data: result
        }
    }

    @Get('dashboard')
    @ApiOperation({
        summary: 'Get admin dashboard statistics (Admin Only)',
        description: 'Overview of system statistics and recent activities'
    })
    async getDashboardStats() {
        const stats = await this.adminService.getAdminDashboardStats()

        return {
            success: true,
            message: 'Dashboard statistics retrieved',
            data: stats
        }
    }

    @Get('transactions/user/:userId')
    @ApiOperation({
        summary: 'Get user admin transaction history (Admin Only)',
        description: 'View all admin transactions for a specific user'
    })
    @ApiParam({ name: 'userId', description: 'User UUID' })
    @ApiQuery({ name: 'limit', type: Number, required: false })
    @ApiQuery({ name: 'offset', type: Number, required: false })
    async getUserTransactionHistory(
        @Param('userId') userId: string,
        @Query('limit') limit: number = 50,
        @Query('offset') offset: number = 0
    ) {
        const result = await this.adminService.getAdminTransactionHistory(
            undefined,
            userId,
            undefined,
            limit,
            offset
        )

        return {
            success: true,
            message: 'User transaction history retrieved',
            data: result
        }
    }
}
