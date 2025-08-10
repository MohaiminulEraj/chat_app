import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { Room } from './room.entity'

@Entity('room_blocked_users')
@Unique(['userId', 'roomId']) // Ensure unique user-room combination for blocked users
@Index(['roomId']) // Index for efficient room-based queries
@Index(['userId']) // Index for efficient user-based queries
export class RoomBlockedUser extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    userId: string

    @Column({ type: 'uuid' })
    roomId: string

    @Column({ type: 'uuid' })
    blockedBy: string // Who blocked this user (host/owner)

    @Column({ type: 'text', nullable: true })
    reason?: string // Optional reason for blocking

    @Column({ default: true })
    isActive: boolean

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    blockedAt: Date

    // Relations
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User

    @ManyToOne(() => Room)
    @JoinColumn({ name: 'roomId', referencedColumnName: 'uuid' })
    room: Room

    @ManyToOne(() => User)
    @JoinColumn({ name: 'blockedBy', referencedColumnName: 'uuid' })
    blockedByUser: User
}
