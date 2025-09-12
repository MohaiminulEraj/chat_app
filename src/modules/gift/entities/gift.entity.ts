import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { GiftTransaction } from './gift-transaction.entity'

export enum GiftCategory {
    HOT = 'hot',
    ACTIVITY = 'activity',
    SVIP = 'svip',
    NOBLE = 'noble'
}

export enum CurrencyType {
    BINS = 'bins',
    DIAMONDS = 'diamonds'
}

export enum GiftRarity {
    COMMON = 'common',
    UNCOMMON = 'uncommon',
    RARE = 'rare',
    LEGENDARY = 'legendary',
    MYTHICAL = 'mythical',
    DIVINE = 'divine',
    COSMIC = 'cosmic'
}

@Entity('gifts')
export class Gift extends CustomBaseEntity {
    @Column()
    name: string

    @Column({ nullable: true })
    title: string

    @Column()
    description: string

    @Column({
        type: 'enum',
        enum: GiftCategory,
        default: GiftCategory.HOT
    })
    category: GiftCategory

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number

    @Column({
        type: 'enum',
        enum: CurrencyType,
        default: CurrencyType.BINS
    })
    currencyType: CurrencyType

    @Column({ nullable: true })
    imageUrl: string

    @Column({ nullable: true })
    giftImage: string

    @Column({
        type: 'enum',
        enum: GiftRarity,
        default: GiftRarity.COMMON
    })
    rarity: GiftRarity

    @Column({ type: 'int', default: 0 })
    popularity: number

    @Column({ type: 'int', default: 0 })
    requiredLevel: number

    @Column({ default: false })
    vipRequired: boolean

    @Column({ type: 'jsonb', nullable: true })
    specialRequirements: string[]

    @Column({ type: 'jsonb', nullable: true })
    effects: {
        animation?: string
        duration?: number
        sound?: string
    }

    @Column({ type: 'int', default: 0 })
    sortOrder: number

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
