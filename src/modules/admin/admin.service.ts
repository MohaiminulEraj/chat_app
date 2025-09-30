import {
    Injectable,
    Logger,
    BadRequestException,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { User } from '../user/entities/user.entity'
import {
    AdminTransaction,
    AdminTransactionType,
    CurrencyType
} from '../user/entities/admin-transaction.entity'
import {
    ConversionConfig,
    ConversionType
} from '../user/entities/conversion-config.entity'

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name)

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(AdminTransaction)
        private adminTransactionRepository: Repository<AdminTransaction>,
        @InjectRepository(ConversionConfig)
        private conversionConfigRepository: Repository<ConversionConfig>,
        private dataSource: DataSource
    ) {}

    /**
     * Admin gift currency to user
     */
    async giftCurrencyToUser(
        adminId: string,
        targetUserId: string,
        currencyType: CurrencyType,
        amount: number,
        reason: string,
        notes?: string
    ): Promise<{
        success: boolean
        transaction: AdminTransaction
        user: {
            id: string
            name: string
            newBalance: number
        }
    }> {
        this.logger.log(
            `🎁 ADMIN_GIFT: Admin ${adminId} gifting ${amount} ${currencyType} to user ${targetUserId}`
        )

        if (amount <= 0) {
            throw new BadRequestException('Gift amount must be positive')
        }

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            // Verify admin exists and has admin role
            const admin = await queryRunner.manager.findOne(User, {
                where: { uuid: adminId }
            })

            if (!admin || admin.userType !== 'admin') {
                throw new BadRequestException(
                    'Unauthorized: Admin access required'
                )
            }

            // Get target user
            const user = await queryRunner.manager.findOne(User, {
                where: { uuid: targetUserId },
                lock: { mode: 'pessimistic_write' }
            })

            if (!user) {
                throw new NotFoundException('Target user not found')
            }

            // Calculate new balance
            const balanceField =
                currencyType === CurrencyType.BINS
                    ? 'binsBalance'
                    : 'diamondBalance'
            const currentBalance = parseFloat(user[balanceField].toString())
            const newBalance = currentBalance + amount

            // Update user balance
            await queryRunner.manager.update(
                User,
                { uuid: targetUserId },
                { [balanceField]: newBalance }
            )

            // Create admin transaction record
            const transaction = queryRunner.manager.create(AdminTransaction, {
                adminId,
                userId: targetUserId,
                transactionType: AdminTransactionType.GIFT,
                currencyType,
                amount,
                balanceBefore: currentBalance,
                balanceAfter: newBalance,
                reason,
                notes,
                metadata: {
                    adminName: admin.name || admin.email,
                    userName: user.name || user.email,
                    timestamp: new Date().toISOString()
                }
            })

            const savedTransaction = await queryRunner.manager.save(transaction)
            await queryRunner.commitTransaction()

            this.logger.log(
                `✅ ADMIN_GIFT: Successfully gifted ${amount} ${currencyType} to user ${user.name || user.email}`
            )

            return {
                success: true,
                transaction: savedTransaction,
                user: {
                    id: user.uuid,
                    name: user.name || user.email,
                    newBalance
                }
            }
        } catch (error) {
            await queryRunner.rollbackTransaction()
            this.logger.error(
                `❌ ADMIN_GIFT failed: ${error.message}`,
                error.stack
            )
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Admin adjust user currency (add or deduct)
     */
    async adjustUserCurrency(
        adminId: string,
        targetUserId: string,
        currencyType: CurrencyType,
        amount: number, // Can be negative for deduction
        transactionType: AdminTransactionType,
        reason: string,
        notes?: string
    ): Promise<{
        success: boolean
        transaction: AdminTransaction
        user: {
            id: string
            name: string
            previousBalance: number
            newBalance: number
            adjustment: number
        }
    }> {
        this.logger.log(
            `⚖️ ADMIN_ADJUST: Admin ${adminId} adjusting ${amount} ${currencyType} for user ${targetUserId}`
        )

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            // Verify admin
            const admin = await queryRunner.manager.findOne(User, {
                where: { uuid: adminId }
            })

            if (!admin || admin.userType !== 'admin') {
                throw new BadRequestException(
                    'Unauthorized: Admin access required'
                )
            }

            // Get target user
            const user = await queryRunner.manager.findOne(User, {
                where: { uuid: targetUserId },
                lock: { mode: 'pessimistic_write' }
            })

            if (!user) {
                throw new NotFoundException('Target user not found')
            }

            // Calculate new balance
            const balanceField =
                currencyType === CurrencyType.BINS
                    ? 'binsBalance'
                    : 'diamondBalance'
            const currentBalance = parseFloat(user[balanceField].toString())
            const newBalance = currentBalance + amount

            // Prevent negative balance
            if (newBalance < 0) {
                throw new BadRequestException(
                    `Insufficient balance. Current: ${currentBalance}, Requested adjustment: ${amount}`
                )
            }

            // Update user balance
            await queryRunner.manager.update(
                User,
                { uuid: targetUserId },
                { [balanceField]: newBalance }
            )

            // Create admin transaction record
            const transaction = queryRunner.manager.create(AdminTransaction, {
                adminId,
                userId: targetUserId,
                transactionType,
                currencyType,
                amount,
                balanceBefore: currentBalance,
                balanceAfter: newBalance,
                reason,
                notes,
                metadata: {
                    adminName: admin.name || admin.email,
                    userName: user.name || user.email,
                    adjustmentType: amount > 0 ? 'credit' : 'debit',
                    timestamp: new Date().toISOString()
                }
            })

            const savedTransaction = await queryRunner.manager.save(transaction)
            await queryRunner.commitTransaction()

            this.logger.log(
                `✅ ADMIN_ADJUST: Successfully adjusted ${amount} ${currencyType} for user ${user.name || user.email}`
            )

            return {
                success: true,
                transaction: savedTransaction,
                user: {
                    id: user.uuid,
                    name: user.name || user.email,
                    previousBalance: currentBalance,
                    newBalance,
                    adjustment: amount
                }
            }
        } catch (error) {
            await queryRunner.rollbackTransaction()
            this.logger.error(
                `❌ ADMIN_ADJUST failed: ${error.message}`,
                error.stack
            )
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Update conversion rates (admin only)
     */
    async updateConversionRate(
        adminId: string,
        conversionType: ConversionType,
        newSourceValue: number,
        newTargetValue: number,
        commissionPercent?: number,
        reason?: string
    ): Promise<{
        success: boolean
        oldConfig: ConversionConfig
        newConfig: ConversionConfig
        transaction: AdminTransaction
    }> {
        this.logger.log(
            `📊 ADMIN_RATE_CHANGE: Admin ${adminId} updating ${conversionType} rate`
        )

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            // Verify admin
            const admin = await queryRunner.manager.findOne(User, {
                where: { uuid: adminId }
            })

            if (!admin || admin.userType !== 'admin') {
                throw new BadRequestException(
                    'Unauthorized: Admin access required'
                )
            }

            // Get current config
            const oldConfig = await queryRunner.manager.findOne(
                ConversionConfig,
                {
                    where: { conversionType },
                    lock: { mode: 'pessimistic_write' }
                }
            )

            if (!oldConfig) {
                throw new NotFoundException(
                    `Conversion config for ${conversionType} not found`
                )
            }

            // Store old values
            const oldSourceValue = oldConfig.sourceValue
            const oldTargetValue = oldConfig.targetValue
            const oldRate = oldTargetValue / oldSourceValue

            // Calculate new rate
            const newRate = newTargetValue / newSourceValue

            // Update config
            oldConfig.sourceValue = newSourceValue
            oldConfig.targetValue = newTargetValue
            if (commissionPercent !== undefined) {
                oldConfig.adminCommissionPercent = commissionPercent
            }
            oldConfig.lastUpdatedBy = adminId
            oldConfig.lastUpdatedAt = new Date()

            const newConfig = await queryRunner.manager.save(oldConfig)

            // Create admin transaction record for rate change
            const transaction = queryRunner.manager.create(AdminTransaction, {
                adminId,
                userId: null, // System-wide change
                transactionType: AdminTransactionType.RATE_CHANGE,
                currencyType: null,
                amount: 0,
                reason: reason || `Updated ${conversionType} conversion rate`,
                notes: `Changed from ${oldSourceValue}:${oldTargetValue} to ${newSourceValue}:${newTargetValue}`,
                metadata: {
                    conversionType,
                    oldRate,
                    newRate,
                    oldSourceValue,
                    oldTargetValue,
                    newSourceValue,
                    newTargetValue,
                    oldCommission: oldConfig.adminCommissionPercent,
                    newCommission:
                        commissionPercent || oldConfig.adminCommissionPercent,
                    adminName: admin.name || admin.email,
                    timestamp: new Date().toISOString()
                }
            })

            const savedTransaction = await queryRunner.manager.save(transaction)
            await queryRunner.commitTransaction()

            this.logger.log(
                `✅ ADMIN_RATE_CHANGE: Successfully updated ${conversionType} rate from ${oldRate} to ${newRate}`
            )

            return {
                success: true,
                oldConfig: {
                    ...oldConfig,
                    sourceValue: oldSourceValue,
                    targetValue: oldTargetValue
                } as any,
                newConfig,
                transaction: savedTransaction
            }
        } catch (error) {
            await queryRunner.rollbackTransaction()
            this.logger.error(
                `❌ ADMIN_RATE_CHANGE failed: ${error.message}`,
                error.stack
            )
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Get admin transaction history
     */
    async getAdminTransactionHistory(
        adminId?: string,
        userId?: string,
        transactionType?: AdminTransactionType,
        limit: number = 50,
        offset: number = 0
    ): Promise<{
        transactions: AdminTransaction[]
        total: number
    }> {
        const query = this.adminTransactionRepository
            .createQueryBuilder('at')
            .leftJoinAndSelect('at.admin', 'admin')
            .leftJoinAndSelect('at.user', 'user')

        if (adminId) {
            query.andWhere('at.adminId = :adminId', { adminId })
        }

        if (userId) {
            query.andWhere('at.userId = :userId', { userId })
        }

        if (transactionType) {
            query.andWhere('at.transactionType = :transactionType', {
                transactionType
            })
        }

        const [transactions, total] = await query
            .orderBy('at.createdAt', 'DESC')
            .take(limit)
            .skip(offset)
            .getManyAndCount()

        return { transactions, total }
    }

    /**
     * Get admin dashboard statistics
     */
    async getAdminDashboardStats(): Promise<{
        totalUsers: number
        activeUsers: number
        totalBinsInCirculation: number
        totalDiamondsInCirculation: number
        recentTransactions: AdminTransaction[]
        conversionRates: ConversionConfig[]
    }> {
        // Get user statistics
        const totalUsers = await this.userRepository.count()
        const activeUsers = await this.userRepository.count({
            where: { isActive: true }
        })

        // Get total currency in circulation
        const currencyStats = await this.userRepository
            .createQueryBuilder('user')
            .select('SUM(user.binsBalance)', 'totalBins')
            .addSelect('SUM(user.diamondBalance)', 'totalDiamonds')
            .getRawOne()

        // Get recent admin transactions
        const recentTransactions = await this.adminTransactionRepository.find({
            relations: ['admin', 'user'],
            order: { createdAt: 'DESC' },
            take: 10
        })

        // Get current conversion rates
        const conversionRates = await this.conversionConfigRepository.find({
            where: { isActive: true }
        })

        return {
            totalUsers,
            activeUsers,
            totalBinsInCirculation: parseFloat(currencyStats?.totalBins || '0'),
            totalDiamondsInCirculation: parseFloat(
                currencyStats?.totalDiamonds || '0'
            ),
            recentTransactions,
            conversionRates
        }
    }
}
