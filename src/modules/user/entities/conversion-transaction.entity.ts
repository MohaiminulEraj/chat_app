import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './user.entity'
import { ConversionType } from './conversion-config.entity'

export enum ConversionStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

@Entity('conversion_transactions')
@Index(['userId', 'conversionType'])
@Index(['status'])
@Index(['createdAt'])
export class ConversionTransaction extends CustomBaseEntity {
    @Column()
    userId: string

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User

    @Column({
        type: 'enum',
        enum: ConversionType
    })
    conversionType: ConversionType

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    sourceAmount: number // Amount being converted from

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    targetAmount: number // Amount being converted to

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    adminCommissionAmount: number // Commission amount taken by admin

    @Column({ type: 'decimal', precision: 15, scale: 4 })
    conversionRate: number // Rate at time of conversion

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    commissionPercent: number // Commission percent at time of conversion

    @Column({
        type: 'enum',
        enum: ConversionStatus,
        default: ConversionStatus.PENDING
    })
    status: ConversionStatus

    @Column({ nullable: true })
    description: string

    @Column({ type: 'jsonb', nullable: true })
    metadata: any // Can store withdrawal details, bank info, etc.

    @Column({ type: 'timestamp', nullable: true })
    processedAt: Date

    @Column({ nullable: true })
    processedBy: string // Admin who processed withdrawal
}
