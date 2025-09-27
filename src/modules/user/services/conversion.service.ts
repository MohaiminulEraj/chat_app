import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { User } from '../entities/user.entity'
import {
    ConversionConfig,
    ConversionType
} from '../entities/conversion-config.entity'
import {
    ConversionTransaction,
    ConversionStatus
} from '../entities/conversion-transaction.entity'
import { AdminWallet } from '../entities/admin-wallet.entity'

@Injectable()
export class ConversionService {
    private readonly logger = new Logger(ConversionService.name)

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(ConversionConfig)
        private conversionConfigRepository: Repository<ConversionConfig>,
        @InjectRepository(ConversionTransaction)
        private conversionTransactionRepository: Repository<ConversionTransaction>,
        @InjectRepository(AdminWallet)
        private adminWalletRepository: Repository<AdminWallet>,
        private dataSource: DataSource
    ) {}

    /**
     * Get conversion rates and configurations
     */
    async getConversionRates() {
        const configs = await this.conversionConfigRepository.find({
            where: { isActive: true }
        })

        const rates = {}
        configs.forEach((config) => {
            rates[config.conversionType] = {
                sourceValue: parseFloat(config.sourceValue.toString()),
                targetValue: parseFloat(config.targetValue.toString()),
                rate: parseFloat(
                    (config.targetValue / config.sourceValue).toFixed(4)
                ),
                commissionPercent: parseFloat(
                    config.adminCommissionPercent.toString()
                ),
                isActive: config.isActive
            }
        })

        return rates
    }

    /**
     * Convert bins to diamonds with commission
     */
    async convertBinsToDiamonds(
        userId: string,
        binsAmount: number
    ): Promise<{
        success: boolean
        diamondsReceived: number
        binsSpent: number
        commissionAmount: number
        newBinsBalance: number
        newDiamondBalance: number
        transactionId: string
    }> {
        this.logger.log(
            `💱 BINS_TO_DIAMONDS: User ${userId} converting ${binsAmount} bins`
        )

        if (binsAmount <= 0) {
            throw new BadRequestException('Amount must be greater than 0')
        }

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            // Get conversion config
            const config = await this.conversionConfigRepository.findOne({
                where: {
                    conversionType: ConversionType.BINS_TO_DIAMOND,
                    isActive: true
                }
            })

            if (!config) {
                throw new BadRequestException(
                    'Bins to diamond conversion is not configured'
                )
            }

            // Get user
            const user = await queryRunner.manager.findOne(User, {
                where: { uuid: userId, isActive: true },
                lock: { mode: 'pessimistic_write' }
            })

            if (!user) {
                throw new NotFoundException('User not found')
            }

            // Check user has sufficient bins
            const currentBinsBalance = parseFloat(user.binsBalance.toString())
            if (currentBinsBalance < binsAmount) {
                throw new BadRequestException('Insufficient bins balance')
            }

            // Calculate conversion with commission
            const conversionRate = config.targetValue / config.sourceValue // e.g., 1/3 = 0.333
            const commissionPercent = config.adminCommissionPercent / 100
            const grossDiamonds = binsAmount * conversionRate
            const commissionAmount = grossDiamonds * commissionPercent
            const netDiamonds = grossDiamonds - commissionAmount

            // Update user balances
            const newBinsBalance = currentBinsBalance - binsAmount
            const newDiamondBalance =
                parseFloat(user.diamondBalance.toString()) + netDiamonds

            await queryRunner.manager.update(
                User,
                { uuid: userId },
                {
                    binsBalance: newBinsBalance,
                    diamondBalance: newDiamondBalance
                }
            )

            // Update admin wallet
            let adminWallet = await queryRunner.manager.findOne(AdminWallet, {
                where: {},
                lock: { mode: 'pessimistic_write' }
            })

            if (!adminWallet) {
                adminWallet = queryRunner.manager.create(AdminWallet, {
                    binsBalance: 0,
                    diamondBalance: 0,
                    usdBalance: 0,
                    totalCommissionsEarned: 0
                })
            }

            adminWallet.diamondBalance =
                parseFloat(adminWallet.diamondBalance.toString()) +
                commissionAmount
            adminWallet.totalCommissionsEarned =
                parseFloat(adminWallet.totalCommissionsEarned.toString()) +
                commissionAmount

            await queryRunner.manager.save(adminWallet)

            // Create transaction record
            const transaction = queryRunner.manager.create(
                ConversionTransaction,
                {
                    userId,
                    conversionType: ConversionType.BINS_TO_DIAMOND,
                    sourceAmount: binsAmount,
                    targetAmount: netDiamonds,
                    adminCommissionAmount: commissionAmount,
                    conversionRate,
                    commissionPercent: config.adminCommissionPercent,
                    status: ConversionStatus.COMPLETED,
                    description: `Converted ${binsAmount} bins to ${netDiamonds.toFixed(
                        2
                    )} diamonds (${commissionAmount.toFixed(2)} commission)`,
                    processedAt: new Date()
                }
            )

            const savedTransaction = await queryRunner.manager.save(transaction)

            await queryRunner.commitTransaction()

            this.logger.log(
                `✅ BINS_TO_DIAMONDS: Success - User ${userId} converted ${binsAmount} bins to ${netDiamonds.toFixed(
                    2
                )} diamonds, admin got ${commissionAmount.toFixed(
                    2
                )} commission`
            )

            return {
                success: true,
                diamondsReceived: parseFloat(netDiamonds.toFixed(2)),
                binsSpent: parseFloat(binsAmount.toFixed(2)),
                commissionAmount: parseFloat(commissionAmount.toFixed(2)),
                newBinsBalance: parseFloat(newBinsBalance.toFixed(2)),
                newDiamondBalance: parseFloat(newDiamondBalance.toFixed(2)),
                transactionId: savedTransaction.uuid
            }
        } catch (error) {
            await queryRunner.rollbackTransaction()
            this.logger.error(
                `❌ BINS_TO_DIAMONDS failed: ${error.message}`,
                error.stack
            )
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Request withdrawal of bins to USD
     */
    async requestWithdrawal(
        userId: string,
        binsAmount: number,
        bankDetails?: any
    ): Promise<{
        success: boolean
        withdrawalRequest: ConversionTransaction
        estimatedUSD: number
    }> {
        this.logger.log(
            `💰 WITHDRAWAL_REQUEST: User ${userId} requesting withdrawal of ${binsAmount} bins`
        )

        if (binsAmount <= 0) {
            throw new BadRequestException('Amount must be greater than 0')
        }

        // Get conversion config
        const config = await this.conversionConfigRepository.findOne({
            where: {
                conversionType: ConversionType.BINS_TO_USD,
                isActive: true
            }
        })

        if (!config) {
            throw new BadRequestException(
                'Bins to USD withdrawal is not available'
            )
        }

        // Get user
        const user = await this.userRepository.findOne({
            where: { uuid: userId, isActive: true }
        })

        if (!user) {
            throw new NotFoundException('User not found')
        }

        // Check user has sufficient bins
        const currentBinsBalance = parseFloat(user.binsBalance.toString())
        if (currentBinsBalance < binsAmount) {
            throw new BadRequestException('Insufficient bins balance')
        }

        // Calculate USD amount
        const conversionRate = config.sourceValue / config.targetValue // e.g., 1/210
        const estimatedUSD = binsAmount * conversionRate

        // Create withdrawal request
        const withdrawalRequest = this.conversionTransactionRepository.create({
            userId,
            conversionType: ConversionType.BINS_TO_USD,
            sourceAmount: binsAmount,
            targetAmount: estimatedUSD,
            adminCommissionAmount: 0, // No commission on withdrawals
            conversionRate,
            commissionPercent: 0,
            status: ConversionStatus.PENDING,
            description: `Withdrawal request: ${binsAmount} bins to ${estimatedUSD.toFixed(
                2
            )} USD`,
            metadata: {
                bankDetails,
                requestedAt: new Date()
            }
        })

        const savedRequest =
            await this.conversionTransactionRepository.save(withdrawalRequest)

        this.logger.log(
            `✅ WITHDRAWAL_REQUEST: Created request ${savedRequest.uuid} for ${binsAmount} bins to ${estimatedUSD.toFixed(
                2
            )} USD`
        )

        return {
            success: true,
            withdrawalRequest: savedRequest,
            estimatedUSD: parseFloat(estimatedUSD.toFixed(2))
        }
    }

    /**
     * Process withdrawal (admin function)
     */
    async processWithdrawal(
        withdrawalId: string,
        adminUserId: string,
        approved: boolean,
        notes?: string
    ): Promise<ConversionTransaction> {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            const withdrawal = await queryRunner.manager.findOne(
                ConversionTransaction,
                {
                    where: { uuid: withdrawalId },
                    lock: { mode: 'pessimistic_write' }
                }
            )

            if (!withdrawal) {
                throw new NotFoundException('Withdrawal request not found')
            }

            if (withdrawal.status !== ConversionStatus.PENDING) {
                throw new BadRequestException(
                    'This withdrawal has already been processed'
                )
            }

            if (approved) {
                // Get user and deduct bins
                const user = await queryRunner.manager.findOne(User, {
                    where: { uuid: withdrawal.userId },
                    lock: { mode: 'pessimistic_write' }
                })

                const currentBalance = parseFloat(user.binsBalance.toString())
                if (currentBalance < withdrawal.sourceAmount) {
                    throw new BadRequestException(
                        'User has insufficient balance for withdrawal'
                    )
                }

                // Deduct bins from user
                await queryRunner.manager.update(
                    User,
                    { uuid: user.uuid },
                    { binsBalance: currentBalance - withdrawal.sourceAmount }
                )

                withdrawal.status = ConversionStatus.COMPLETED
            } else {
                withdrawal.status = ConversionStatus.CANCELLED
            }

            withdrawal.processedAt = new Date()
            withdrawal.processedBy = adminUserId
            withdrawal.metadata = {
                ...withdrawal.metadata,
                processedNotes: notes,
                processedAt: new Date()
            }

            const savedWithdrawal = await queryRunner.manager.save(withdrawal)

            await queryRunner.commitTransaction()

            return savedWithdrawal
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Get user conversion history
     */
    async getUserConversionHistory(
        userId: string,
        conversionType?: ConversionType
    ) {
        const query = this.conversionTransactionRepository
            .createQueryBuilder('transaction')
            .where('transaction.userId = :userId', { userId })
            .orderBy('transaction.createdAt', 'DESC')

        if (conversionType) {
            query.andWhere('transaction.conversionType = :conversionType', {
                conversionType
            })
        }

        return query.getMany()
    }

    /**
     * Update conversion configuration (admin)
     */
    async updateConversionConfig(
        conversionType: ConversionType,
        config: {
            sourceValue?: number
            targetValue?: number
            adminCommissionPercent?: number
            isActive?: boolean
        },
        adminUserId: string
    ): Promise<ConversionConfig> {
        let conversionConfig = await this.conversionConfigRepository.findOne({
            where: { conversionType }
        })

        if (!conversionConfig) {
            conversionConfig = this.conversionConfigRepository.create({
                conversionType
            })
        }

        if (config.sourceValue !== undefined) {
            conversionConfig.sourceValue = config.sourceValue
        }
        if (config.targetValue !== undefined) {
            conversionConfig.targetValue = config.targetValue
        }
        if (config.adminCommissionPercent !== undefined) {
            conversionConfig.adminCommissionPercent =
                config.adminCommissionPercent
        }
        if (config.isActive !== undefined) {
            conversionConfig.isActive = config.isActive
        }

        conversionConfig.lastUpdatedBy = adminUserId
        conversionConfig.lastUpdatedAt = new Date()

        return this.conversionConfigRepository.save(conversionConfig)
    }

    /**
     * Get admin wallet stats
     */
    async getAdminWalletStats() {
        const wallet = await this.adminWalletRepository.findOne({
            where: {}
        })

        if (!wallet) {
            return {
                binsBalance: 0,
                diamondBalance: 0,
                usdBalance: 0,
                totalCommissionsEarned: 0,
                statistics: {}
            }
        }

        return {
            binsBalance: parseFloat(wallet.binsBalance.toString()),
            diamondBalance: parseFloat(wallet.diamondBalance.toString()),
            usdBalance: parseFloat(wallet.usdBalance.toString()),
            totalCommissionsEarned: parseFloat(
                wallet.totalCommissionsEarned.toString()
            ),
            statistics: wallet.statistics || {}
        }
    }

    /**
     * Initialize default conversion configurations
     */
    async initializeDefaultConfigs() {
        const configs = [
            {
                conversionType: ConversionType.DIAMOND_TO_BINS,
                sourceValue: 1, // 1 diamond
                targetValue: 2, // 2 bins
                adminCommissionPercent: 0, // No commission on gift receiving
                isActive: true
            },
            {
                conversionType: ConversionType.BINS_TO_DIAMOND,
                sourceValue: 3, // 3 bins
                targetValue: 1, // 1 diamond
                adminCommissionPercent: 70, // 70% commission (user gets 30%)
                isActive: true
            },
            {
                conversionType: ConversionType.BINS_TO_USD,
                sourceValue: 1, // 1 USD
                targetValue: 210, // 210 bins
                adminCommissionPercent: 0, // No commission on withdrawals
                isActive: true
            }
        ]

        for (const configData of configs) {
            const existing = await this.conversionConfigRepository.findOne({
                where: { conversionType: configData.conversionType }
            })

            if (!existing) {
                const config =
                    this.conversionConfigRepository.create(configData)
                await this.conversionConfigRepository.save(config)
            }
        }

        // Initialize admin wallet if not exists
        const walletCount = await this.adminWalletRepository.count()
        if (walletCount === 0) {
            const wallet = this.adminWalletRepository.create({
                binsBalance: 0,
                diamondBalance: 0,
                usdBalance: 0,
                totalCommissionsEarned: 0,
                statistics: {}
            })
            await this.adminWalletRepository.save(wallet)
        }
    }
}
