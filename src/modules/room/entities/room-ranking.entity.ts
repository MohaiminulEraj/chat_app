import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { Room } from './room.entity'

export enum RankingPeriod {
    HOURLY = 'hourly',
    WEEKLY = 'weekly',
    TOTAL = 'total',
    ONLINE = 'online'
}

@Entity('room_rankings')
@Index(['roomId', 'period', 'createdAt'])
@Index(['userId', 'roomId', 'period'])
@Index(['roomId', 'period', 'rank'])
export class RoomRanking extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    roomId: string

    @Column({ type: 'uuid' })
    userId: string

    @Column({
        type: 'enum',
        enum: RankingPeriod
    })
    period: RankingPeriod

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    giftsSentValue: number

    @Column({ type: 'int', default: 0 })
    giftsSentCount: number

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    giftsReceivedValue: number

    @Column({ type: 'int', default: 0 })
    giftsReceivedCount: number

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalScore: number

    @Column({ type: 'int', default: 0 })
    rank: number

    @Column({ type: 'timestamp', nullable: true })
    lastActivityAt: Date

    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        topGiftSent?: { giftId: string; giftName: string; value: number }
        topGiftReceived?: { giftId: string; giftName: string; value: number }
        uniqueSenders?: number
        uniqueReceivers?: number
        isOnline?: boolean
    }

    @ManyToOne(() => Room)
    @JoinColumn({ name: 'roomId', referencedColumnName: 'uuid' })
    room: Room

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User
}
