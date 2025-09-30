import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, ManyToOne, JoinColumn, Index } from 'typeorm'
import { User } from './user.entity'

export enum AdminTransactionType {
    GIFT = 'gift',
    ADJUSTMENT = 'adjustment',
    COMPENSATION = 'compensation',
    BONUS = 'bonus',
    PENALTY = 'penalty',
    RATE_CHANGE = 'rate_change',
    SYSTEM_CREDIT = 'system_credit',
    SYSTEM_DEBIT = 'system_debit'
}

export enum CurrencyType {
    BINS = 'bins',
    DIAMONDS = 'diamonds'
}

@Entity('admin_transactions')
@Index(['adminId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['transactionType', 'createdAt'])
export class AdminTransaction extends CustomBaseEntity {
    @Column('uuid')
    adminId: string

    @Column('uuid', { nullable: true })
    userId: string // Null for system-wide changes like rate changes

    @Column({
        type: 'enum',
        enum: AdminTransactionType
    })
    transactionType: AdminTransactionType

    @Column({
        type: 'enum',
        enum: CurrencyType,
        nullable: true
    })
    currencyType: CurrencyType

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    amount: number

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    balanceBefore: number

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    balanceAfter: number

    @Column({ type: 'text' })
    reason: string

    @Column({ type: 'text', nullable: true })
    notes: string

    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        oldRate?: number
        newRate?: number
        conversionType?: string
        ipAddress?: string
        userAgent?: string
        adminName?: string
        userName?: string
        adjustmentType?: string
        timestamp?: string
        [key: string]: any
    }

    // Relations
    @ManyToOne(() => User)
    @JoinColumn({ name: 'adminId' })
    admin: User

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User
}
