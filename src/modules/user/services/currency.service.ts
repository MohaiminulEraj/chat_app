import {
    Injectable,
    BadRequestException,
    NotFoundException,
    Logger
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { User } from '../entities/user.entity'
import {
    CurrencyConfig,
    CurrencyType
} from '../entities/currency-config.entity'
import {
    CurrencyTransaction,
    TransactionType,
    TransactionStatus
} from '../entities/currency-transaction.entity'

@Injectable()
export class CurrencyService {
    private readonly logger = new Logger(CurrencyService.name)

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(CurrencyConfig)
        private currencyConfigRepository: Repository<CurrencyConfig>,
        @InjectRepository(CurrencyTransaction)
        private currencyTransactionRepository: Repository<CurrencyTransaction>,
        private dataSource: DataSource
    ) {}

    /**
     * Get user's currency balances formatted as numbers
     */
    async getUserBalances(userId: string): Promise<{
        binsBalance: number
        diamondBalance: number
    }> {
        const user = await this.userRepository.findOne({
            where: { uuid: userId, isActive: true },
            select: ['uuid', 'binsBalance', 'diamondBalance']
        })

        if (!user) {
            throw new NotFoundException('User not found')
        }

        return {
            binsBalance: parseFloat(user.binsBalance.toString()),
            diamondBalance: parseFloat(user.diamondBalance.toString())
        }
    }

    /**
     * Purchase diamonds using bins
     */
    async purchaseDiamonds(
        userId: string,
        binAmount: number,
        adminUserId?: string
    ): Promise<{
        success: boolean
        diamondsReceived: number
        binsSpent: number
        newBinsBalance: number
        newDiamondBalance: number
        transactionId: string
    }> {
        this.logger.log(
            `💎 PURCHASE_DIAMONDS: User ${userId} purchasing diamonds with ${binAmount} bins`
        )

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            // Get currency config for diamonds
            const diamondConfig = await this.currencyConfigRepository.findOne({
                where: { currencyType: CurrencyType.DIAMOND, isActive: true }
            })

            if (!diamondConfig) {
                throw new BadRequestException(
                    'Diamond currency is not configured'
                )
            }

            // Calculate diamonds to receive
            const exchangeRate = parseFloat(
                diamondConfig.binsToDiamondRate.toString()
            )
            const diamondsToReceive = binAmount / exchangeRate

            // Get user and check bins balance
            const user = await queryRunner.manager.findOne(User, {
                where: { uuid: userId, isActive: true },
                lock: { mode: 'pessimistic_write' }
            })

            if (!user) {
                throw new NotFoundException('User not found')
            }

            const currentBinsBalance = parseFloat(user.binsBalance.toString())
            if (currentBinsBalance < binAmount) {
                throw new BadRequestException('Insufficient bins balance')
            }

            // Update user balances
            const newBinsBalance = currentBinsBalance - binAmount
            const newDiamondBalance =
                parseFloat(user.diamondBalance.toString()) + diamondsToReceive

            await queryRunner.manager.update(
                User,
                { uuid: userId },
                {
                    binsBalance: newBinsBalance,
                    diamondBalance: newDiamondBalance
                }
            )

            // Create bins debit transaction
            const binsTransaction = queryRunner.manager.create(
                CurrencyTransaction,
                {
                    userId,
                    currencyType: CurrencyType.BINS,
                    transactionType: TransactionType.PURCHASE_DIAMOND,
                    status: TransactionStatus.COMPLETED,
                    amount: -binAmount,
                    balanceAfter: newBinsBalance,
                    exchangeRate,
                    description: `Purchased ${diamondsToReceive} diamonds`,
                    processedAt: new Date(),
                    processedBy: adminUserId,
                    metadata: {
                        conversionDetails: {
                            diamondsReceived: diamondsToReceive,
                            exchangeRate
                        }
                    }
                }
            )

            // Create diamond credit transaction
            const diamondTransaction = queryRunner.manager.create(
                CurrencyTransaction,
                {
                    userId,
                    currencyType: CurrencyType.DIAMOND,
                    transactionType: TransactionType.PURCHASE_DIAMOND,
                    status: TransactionStatus.COMPLETED,
                    amount: diamondsToReceive,
                    balanceAfter: newDiamondBalance,
                    exchangeRate,
                    description: `Received diamonds from ${binAmount} bins`,
                    processedAt: new Date(),
                    processedBy: adminUserId,
                    metadata: {
                        conversionDetails: {
                            binsSpent: binAmount,
                            exchangeRate
                        }
                    }
                }
            )

            const savedBinsTransaction =
                await queryRunner.manager.save(binsTransaction)
            await queryRunner.manager.save(diamondTransaction)

            await queryRunner.commitTransaction()

            this.logger.log(
                `✅ PURCHASE_DIAMONDS: Success - User ${userId} spent ${binAmount} bins, received ${diamondsToReceive} diamonds`
            )

            return {
                success: true,
                diamondsReceived: parseFloat(diamondsToReceive.toFixed(2)),
                binsSpent: parseFloat(binAmount.toFixed(2)),
                newBinsBalance: parseFloat(newBinsBalance.toFixed(2)),
                newDiamondBalance: parseFloat(newDiamondBalance.toFixed(2)),
                transactionId: savedBinsTransaction.uuid
            }
        } catch (error) {
            await queryRunner.rollbackTransaction()
            this.logger.error(
                `❌ PURCHASE_DIAMONDS failed: ${error.message}`,
                error.stack
            )
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Add currency to user (admin function)
     */
    async addCurrency(
        userId: string,
        currencyType: CurrencyType,
        amount: number,
        description: string,
        adminUserId: string
    ): Promise<{
        success: boolean
        newBalance: number
        transactionId: string
    }> {
        this.logger.log(
            `💰 ADD_CURRENCY: Adding ${amount} ${currencyType} to user ${userId}`
        )

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            const user = await queryRunner.manager.findOne(User, {
                where: { uuid: userId, isActive: true },
                lock: { mode: 'pessimistic_write' }
            })

            if (!user) {
                throw new NotFoundException('User not found')
            }

            let newBalance: number
            const updateData: Partial<User> = {}

            if (currencyType === CurrencyType.BINS) {
                const currentBalance = parseFloat(user.binsBalance.toString())
                newBalance = currentBalance + amount
                updateData.binsBalance = newBalance
            } else {
                const currentBalance = parseFloat(
                    user.diamondBalance.toString()
                )
                newBalance = currentBalance + amount
                updateData.diamondBalance = newBalance
            }

            await queryRunner.manager.update(User, { uuid: userId }, updateData)

            const transaction = queryRunner.manager.create(
                CurrencyTransaction,
                {
                    userId,
                    currencyType,
                    transactionType: TransactionType.ADMIN_ADJUSTMENT,
                    status: TransactionStatus.COMPLETED,
                    amount,
                    balanceAfter: newBalance,
                    description,
                    processedAt: new Date(),
                    processedBy: adminUserId,
                    metadata: {
                        adminUserId
                    }
                }
            )

            const savedTransaction = await queryRunner.manager.save(transaction)
            await queryRunner.commitTransaction()

            this.logger.log(
                `✅ ADD_CURRENCY: Added ${amount} ${currencyType} to user ${userId}`
            )

            return {
                success: true,
                newBalance: parseFloat(newBalance.toFixed(2)),
                transactionId: savedTransaction.uuid
            }
        } catch (error) {
            await queryRunner.rollbackTransaction()
            this.logger.error(
                `❌ ADD_CURRENCY failed: ${error.message}`,
                error.stack
            )
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Deduct currency from user
     */
    async deductCurrency(
        userId: string,
        currencyType: CurrencyType,
        amount: number,
        transactionType: TransactionType,
        description: string,
        metadata?: any
    ): Promise<{
        success: boolean
        newBalance: number
        transactionId: string
    }> {
        this.logger.log(
            `💸 DEDUCT_CURRENCY: Deducting ${amount} ${currencyType} from user ${userId}`
        )

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()

        try {
            const user = await queryRunner.manager.findOne(User, {
                where: { uuid: userId, isActive: true },
                lock: { mode: 'pessimistic_write' }
            })

            if (!user) {
                throw new NotFoundException('User not found')
            }

            let currentBalance: number
            let newBalance: number
            const updateData: Partial<User> = {}

            if (currencyType === CurrencyType.BINS) {
                currentBalance = parseFloat(user.binsBalance.toString())
                newBalance = currentBalance - amount
                if (newBalance < 0) {
                    throw new BadRequestException('Insufficient bins balance')
                }
                updateData.binsBalance = newBalance
            } else {
                currentBalance = parseFloat(user.diamondBalance.toString())
                newBalance = currentBalance - amount
                if (newBalance < 0) {
                    throw new BadRequestException(
                        'Insufficient diamond balance'
                    )
                }
                updateData.diamondBalance = newBalance
            }

            await queryRunner.manager.update(User, { uuid: userId }, updateData)

            const transaction = queryRunner.manager.create(
                CurrencyTransaction,
                {
                    userId,
                    currencyType,
                    transactionType,
                    status: TransactionStatus.COMPLETED,
                    amount: -amount,
                    balanceAfter: newBalance,
                    description,
                    processedAt: new Date(),
                    metadata
                }
            )

            const savedTransaction = await queryRunner.manager.save(transaction)
            await queryRunner.commitTransaction()

            this.logger.log(
                `✅ DEDUCT_CURRENCY: Deducted ${amount} ${currencyType} from user ${userId}`
            )

            return {
                success: true,
                newBalance: parseFloat(newBalance.toFixed(2)),
                transactionId: savedTransaction.uuid
            }
        } catch (error) {
            await queryRunner.rollbackTransaction()
            this.logger.error(
                `❌ DEDUCT_CURRENCY failed: ${error.message}`,
                error.stack
            )
            throw error
        } finally {
            await queryRunner.release()
        }
    }

    /**
     * Get user's transaction history
     */
    async getUserTransactionHistory(
        userId: string,
        limit: number = 50,
        offset: number = 0,
        currencyType?: CurrencyType
    ): Promise<{
        transactions: any[]
        total: number
    }> {
        const whereClause: any = { userId }
        if (currencyType) {
            whereClause.currencyType = currencyType
        }

        const [transactions, total] =
            await this.currencyTransactionRepository.findAndCount({
                where: whereClause,
                order: { createdAt: 'DESC' },
                take: limit,
                skip: offset,
                relations: ['relatedUser']
            })

        const formattedTransactions = transactions.map((transaction) => ({
            id: transaction.uuid,
            currencyType: transaction.currencyType,
            transactionType: transaction.transactionType,
            status: transaction.status,
            amount: parseFloat(transaction.amount.toString()),
            balanceAfter: parseFloat(transaction.balanceAfter.toString()),
            description: transaction.description,
            createdAt: transaction.createdAt,
            processedAt: transaction.processedAt,
            relatedUser: transaction.relatedUser
                ? {
                      id: transaction.relatedUser.uuid,
                      name: transaction.relatedUser.name,
                      displayName: transaction.relatedUser.displayName
                  }
                : null,
            metadata: transaction.metadata
        }))

        return {
            transactions: formattedTransactions,
            total
        }
    }

    /**
     * Get currency configuration (admin)
     */
    async getCurrencyConfig(): Promise<{
        bins: any
        diamond: any
    }> {
        const configs = await this.currencyConfigRepository.find({
            where: { isActive: true }
        })

        const binsConfig = configs.find(
            (c) => c.currencyType === CurrencyType.BINS
        )
        const diamondConfig = configs.find(
            (c) => c.currencyType === CurrencyType.DIAMOND
        )

        return {
            bins: binsConfig
                ? {
                      exchangeRateToUSD: parseFloat(
                          binsConfig.exchangeRateToUSD.toString()
                      ),
                      minimumPurchaseAmount: parseFloat(
                          binsConfig.minimumPurchaseAmount.toString()
                      ),
                      maximumPurchaseAmount: parseFloat(
                          binsConfig.maximumPurchaseAmount.toString()
                      ),
                      metadata: binsConfig.metadata
                  }
                : null,
            diamond: diamondConfig
                ? {
                      exchangeRateToUSD: parseFloat(
                          diamondConfig.exchangeRateToUSD.toString()
                      ),
                      binsToDiamondRate: parseFloat(
                          diamondConfig.binsToDiamondRate.toString()
                      ),
                      minimumPurchaseAmount: parseFloat(
                          diamondConfig.minimumPurchaseAmount.toString()
                      ),
                      maximumPurchaseAmount: parseFloat(
                          diamondConfig.maximumPurchaseAmount.toString()
                      ),
                      metadata: diamondConfig.metadata
                  }
                : null
        }
    }

    /**
     * Update currency configuration (admin)
     */
    async updateCurrencyConfig(
        currencyType: CurrencyType,
        config: Partial<CurrencyConfig>,
        adminUserId: string
    ): Promise<CurrencyConfig> {
        let existingConfig = await this.currencyConfigRepository.findOne({
            where: { currencyType }
        })

        if (!existingConfig) {
            existingConfig = this.currencyConfigRepository.create({
                currencyType,
                ...config,
                updatedBy: adminUserId,
                lastUpdatedAt: new Date()
            })
        } else {
            Object.assign(existingConfig, {
                ...config,
                updatedBy: adminUserId,
                lastUpdatedAt: new Date()
            })
        }

        return await this.currencyConfigRepository.save(existingConfig)
    }
}
