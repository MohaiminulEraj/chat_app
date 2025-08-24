import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { Room } from './room.entity'
import { PKBattleParticipant } from './pk-battle-participant.entity'
import { PKBattleGift } from './pk-battle-gift.entity'

export enum PKBattleStatus {
    PENDING = 'pending', // Waiting for approval
    APPROVED = 'approved', // Approved but not started
    ACTIVE = 'active', // Currently running
    COMPLETED = 'completed', // Finished normally
    CANCELLED = 'cancelled', // Cancelled by host
    EXPIRED = 'expired' // Time expired
}

export enum PKBattleType {
    HOST_SELECTED = 'host_selected', // Host manually selects participants
    RANDOM = 'random', // Randomly selected participants
    ROOM_VS_ROOM = 'room_vs_room' // Future: Room vs Room battles
}

@Entity('pk_battles')
export class PKBattle extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    roomId: string

    @Column({ type: 'uuid' })
    hostId: string // Host who created the battle

    @Column({
        type: 'enum',
        enum: PKBattleType,
        default: PKBattleType.HOST_SELECTED
    })
    battleType: PKBattleType

    @Column({
        type: 'enum',
        enum: PKBattleStatus,
        default: PKBattleStatus.PENDING
    })
    status: PKBattleStatus

    @Column({ type: 'int' }) // Duration in seconds
    duration: number

    @Column({ type: 'timestamp', nullable: true })
    startTime?: Date

    @Column({ type: 'timestamp', nullable: true })
    endTime?: Date

    @Column({ type: 'uuid', nullable: true })
    winnerId?: string // Winner participant ID

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    totalGiftsValue: number // Total value of all gifts in this battle

    @Column({ type: 'text', nullable: true })
    description?: string // Battle description or rules

    @Column({ type: 'jsonb', nullable: true })
    metadata?: any // Additional battle settings

    @Column({ default: true })
    isActive: boolean

    // Relations
    @ManyToOne(() => Room)
    @JoinColumn({ name: 'roomId', referencedColumnName: 'uuid' })
    room: Room

    @ManyToOne(() => User)
    @JoinColumn({ name: 'hostId', referencedColumnName: 'uuid' })
    host: User

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'winnerId', referencedColumnName: 'uuid' })
    winner?: User

    @OneToMany(() => PKBattleParticipant, (participant) => participant.battle)
    participants: PKBattleParticipant[]

    @OneToMany(() => PKBattleGift, (gift) => gift.battle)
    gifts: PKBattleGift[]
}
