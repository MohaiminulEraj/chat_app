import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index } from 'typeorm'

export enum TaskType {
    USER = 'user', // Task for individual users
    ROOM = 'room', // Task for room participants
    GLOBAL = 'global' // Global task for all users
}

export enum TaskCategory {
    USER_TAB = 'user_tab',
    ROOM_TAB = 'room_tab'
}

@Entity('daily_tasks')
@Index(['taskType', 'roomId', 'isActive'])
@Index(['category', 'isActive'])
export class DailyTask extends CustomBaseEntity {
    @Column({ unique: true })
    taskId: string // e.g., 'join_video_calls', 'send_messages'

    @Column()
    icon: string // Icon identifier (e.g., 'video_call', 'message')

    @Column()
    title: string // Display title

    @Column({ type: 'text', nullable: true })
    description: string // Optional description

    @Column({ type: 'int' })
    total: number // Total required to complete task

    @Column({ type: 'int' })
    reward: number // Reward amount (coins/diamonds)

    @Column({ default: '#1976D2' })
    color: string // Hex color for UI

    @Column({
        type: 'enum',
        enum: TaskType,
        default: TaskType.USER
    })
    taskType: TaskType

    @Column({
        type: 'enum',
        enum: TaskCategory,
        default: TaskCategory.USER_TAB
    })
    category: TaskCategory

    @Column({ type: 'uuid', nullable: true })
    roomId: string // Null for global tasks, specific room UUID for room-specific tasks

    @Column({ default: true })
    isActive: boolean

    @Column({ default: 0 })
    sortOrder: number // For ordering tasks in UI

    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        rewardType?: 'bins' | 'diamonds' // Type of reward currency
        requiredLevel?: number // Minimum user level required
        expiresAt?: Date // Task expiration date
        repeatDaily?: boolean // Whether task resets daily
        requirements?: any // Additional task requirements
    }

    @Column({ type: 'uuid' })
    createdBy: string // Admin who created the task
}
