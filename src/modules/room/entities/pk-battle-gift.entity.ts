import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { Gift } from '../../gift/entities/gift.entity'
import { PKBattle } from './pk-battle.entity'

@Entity('pk_battle_gifts')
export class PKBattleGift extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    battleId: string

    @Column({ type: 'uuid' })
    giftId: string

    @Column({ type: 'uuid' })
    senderId: string // User who sent the gift

    @Column({ type: 'uuid' })
    receiverId: string // Participant who received the gift

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    giftValue: number // Value of the gift at time of sending

    @Column({ type: 'int', default: 1 })
    quantity: number // Number of this gift sent

    @Column({ type: 'text', nullable: true })
    message?: string // Optional message with the gift

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    sentAt: Date

    @Column({ type: 'jsonb', nullable: true })
    metadata?: any // Additional gift metadata

    // Relations
    @ManyToOne(() => PKBattle, (battle) => battle.gifts, {
        onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'battleId', referencedColumnName: 'uuid' })
    battle: PKBattle

    @ManyToOne(() => Gift)
    @JoinColumn({ name: 'giftId', referencedColumnName: 'uuid' })
    gift: Gift

    @ManyToOne(() => User)
    @JoinColumn({ name: 'senderId', referencedColumnName: 'uuid' })
    sender: User

    @ManyToOne(() => User)
    @JoinColumn({ name: 'receiverId', referencedColumnName: 'uuid' })
    receiver: User
}
