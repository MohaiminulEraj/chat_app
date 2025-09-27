import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { Gift } from './gift.entity'

export enum TransactionStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded'
}

@Entity('gift_transactions')
export class GiftTransaction extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    giftId: string

    @Column({ type: 'uuid' })
    userId: string

    @Column({ type: 'uuid' })
    senderId: string

    @Column({ type: 'uuid' })
    receiverId: string

    @Column({ type: 'uuid', nullable: true })
    roomId?: string

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number

    @Column({ type: 'int', default: 1 })
    quantity: number

    @Column({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING
    })
    status: TransactionStatus

    @Column({ nullable: true })
    message?: string

    @Column({ nullable: true })
    paymentMethod?: string

    @Column({ nullable: true })
    transactionReference?: string

    @Column({ type: 'jsonb', nullable: true })
    metadata?: any // Store conversion info, gift details, etc.

    // Relations
    @ManyToOne(() => Gift, (gift) => gift.transactions)
    @JoinColumn({ name: 'giftId', referencedColumnName: 'uuid' })
    gift: Gift

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User

    @ManyToOne(() => User)
    @JoinColumn({ name: 'senderId', referencedColumnName: 'uuid' })
    sender: User

    @ManyToOne(() => User)
    @JoinColumn({ name: 'receiverId', referencedColumnName: 'uuid' })
    receiver: User
}
