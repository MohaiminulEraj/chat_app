import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { DailyTask } from './daily-task.entity'

@Entity('user_task_progress')
@Unique(['userId', 'taskId', 'date'])
@Index(['userId', 'date'])
@Index(['taskId', 'isCompleted'])
export class UserTaskProgress extends CustomBaseEntity {
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
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User

    @ManyToOne(() => DailyTask)
    @JoinColumn({ name: 'taskId', referencedColumnName: 'uuid' })
    task: DailyTask
}
