import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { User } from './user.entity'
import { CurrencyType } from './currency-config.entity'

export enum TransactionType {
    PURCHASE_DIAMOND = 'purchase_diamond',
    GIFT_SENT = 'gift_sent',
    GIFT_RECEIVED = 'gift_received',
    ADMIN_ADJUSTMENT = 'admin_adjustment',
    EARN_BINS = 'earn_bins',
    REFUND = 'refund',
    PENALTY = 'penalty',
    BONUS = 'bonus',
    TRANSFER_IN = 'transfer_in',
    TRANSFER_OUT = 'transfer_out'
}

export enum TransactionStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
    REFUNDED = 'refunded'
}

@Entity('currency_transactions')
@Index(['userId', 'createdAt'])
@Index(['transactionType', 'status'])
@Index(['currencyType'])
export class CurrencyTransaction extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    userId: string

    @Column({
        type: 'enum',
        enum: CurrencyType
    })
    currencyType: CurrencyType

    @Column({
        type: 'enum',
        enum: TransactionType
    })
    transactionType: TransactionType

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING
    })
    status: TransactionStatus

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number // Positive for credit, negative for debit

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    balanceAfter: number // User's balance after this transaction

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    exchangeRate: number // Rate used for conversion (if applicable)

    @Column({ type: 'uuid', nullable: true })
    relatedUserId: string // For transfers or gift transactions

    @Column({ nullable: true })
    description: string

    @Column({ nullable: true })
    referenceId: string // External reference (payment gateway, gift ID, etc.)

    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        giftId?: string
        giftName?: string
        roomId?: string
        paymentGateway?: string
        adminUserId?: string
        originalAmount?: number
        originalCurrency?: string
        conversionDetails?: any
    }

    @Column({ type: 'timestamp', nullable: true })
    processedAt: Date

    @Column({ type: 'uuid', nullable: true })
    processedBy: string

    // Relations
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'relatedUserId', referencedColumnName: 'uuid' })
    relatedUser: User
}
