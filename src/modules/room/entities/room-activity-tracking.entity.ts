import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { Room } from './room.entity'
import { User } from '../../user/entities/user.entity'

@Entity('room_activity_tracking')
@Index(['roomId', 'userId', 'activityDate'], { unique: true }) // Prevent duplicate entries for same user/room/day
export class RoomActivityTracking extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    roomId: string

    @Column({ type: 'uuid' })
    userId: string

    @Column({ type: 'date' })
    activityDate: Date

    @Column({ type: 'int', default: 1 })
    visitCount: number // Number of times user joined this room on this date

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    lastVisitTime: Date

    // Relations
    @ManyToOne(() => Room)
    @JoinColumn({ name: 'roomId', referencedColumnName: 'uuid' })
    room: Room

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User
}
