import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { GiftTransaction } from './gift-transaction.entity'

@Entity('gifts')
export class Gift extends CustomBaseEntity {
    @Column()
    name: string

    @Column()
    description: string

    @Column()
    category: string

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number

    @Column({ nullable: true })
    imageUrl: string

    @Column({ default: true })
    isActive: boolean

    // For sent/received gifts tracking
    @Column({ type: 'uuid', nullable: true })
    senderId: string

    @Column({ type: 'uuid', nullable: true })
    receiverId: string

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    value: number

    @Column({ nullable: true })
    message?: string

    @Column({ default: false })
    isAnonymous: boolean

    // Relations
    @ManyToOne(() => User, (user) => user.sentGifts, { nullable: true })
    @JoinColumn({ name: 'senderId', referencedColumnName: 'uuid' })
    sender: User

    @ManyToOne(() => User, (user) => user.receivedGifts, { nullable: true })
    @JoinColumn({ name: 'receiverId', referencedColumnName: 'uuid' })
    receiver: User

    @OneToMany(() => GiftTransaction, (transaction) => transaction.gift)
    transactions: GiftTransaction[]
}
