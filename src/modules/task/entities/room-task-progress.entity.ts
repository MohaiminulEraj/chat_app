import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { Room } from '../../room/entities/room.entity'
import { User } from '../../user/entities/user.entity'
import { DailyTask } from './daily-task.entity'

@Entity('room_task_progress')
@Unique(['roomId', 'userId', 'taskId', 'date'])
@Index(['roomId', 'userId', 'date'])
@Index(['taskId', 'isCompleted'])
export class RoomTaskProgress extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    roomId: string

    @Column({ type: 'uuid' })
    userId: string

    @Column({ type: 'uuid' })
    taskId: string

    @Column({ type: 'int', default: 0 })
    progress: number // Current progress

    @Column({ default: false })
    isCompleted: boolean

    @Column({ default: false })
    rewardClaimed: boolean

    @Column({ type: 'date' })
    date: Date // Date for which this progress is tracked

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date

    @Column({ type: 'timestamp', nullable: true })
    rewardClaimedAt: Date

    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        lastActionAt?: Date
        actionsToday?: number
        details?: any
    }

    // Relations
    @ManyToOne(() => Room)
    @JoinColumn({ name: 'roomId', referencedColumnName: 'uuid' })
    room: Room

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User

    @ManyToOne(() => DailyTask)
    @JoinColumn({ name: 'taskId', referencedColumnName: 'uuid' })
    task: DailyTask
}
