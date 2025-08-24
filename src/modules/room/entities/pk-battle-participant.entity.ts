import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { PKBattle } from './pk-battle.entity'

export enum PKBattleParticipantStatus {
    INVITED = 'invited', // Invited to participate
    ACCEPTED = 'accepted', // Accepted the invitation
    DECLINED = 'declined', // Declined the invitation
    ACTIVE = 'active', // Currently battling
    COMPLETED = 'completed' // Battle finished
}

@Entity('pk_battle_participants')
export class PKBattleParticipant extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    battleId: string

    @Column({ type: 'uuid' })
    userId: string

    @Column({
        type: 'enum',
        enum: PKBattleParticipantStatus,
        default: PKBattleParticipantStatus.INVITED
    })
    status: PKBattleParticipantStatus

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    totalGiftsReceived: number // Total value of gifts received during battle

    @Column({ type: 'int', default: 0 })
    giftCount: number // Number of gifts received

    @Column({ type: 'int', default: 1 })
    position: number // 1 for participant 1, 2 for participant 2

    @Column({ type: 'timestamp', nullable: true })
    joinedAt?: Date

    @Column({ type: 'jsonb', nullable: true })
    battleStats?: any // Additional battle statistics

    // Relations
    @ManyToOne(() => PKBattle, (battle) => battle.participants, {
        onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'battleId', referencedColumnName: 'uuid' })
    battle: PKBattle

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User
}
