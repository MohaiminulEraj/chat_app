import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { Room } from './room.entity'

export enum RoomRole {
    OWNER = 'owner',
    HOST = 'host',
    ADMIN = 'admin',
    SPEAKER = 'speaker',
    LISTENER = 'listener'
}

@Entity('room_roles')
@Unique(['userId', 'roomId', 'role']) // Ensure unique user-room-role combination
@Index(['roomId', 'role']) // Index for efficient role queries
@Index(['userId', 'roomId']) // Index for user-room queries
export class RoomRoleAssignment extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    userId: string

    @Column({ type: 'uuid' })
    roomId: string

    @Column({
        type: 'enum',
        enum: RoomRole
    })
    role: RoomRole

    @Column({ default: true })
    isActive: boolean

    @Column({ type: 'uuid', nullable: true })
    assignedBy: string // Who assigned this role

    @Column({ type: 'timestamp', nullable: true })
    assignedAt: Date

    @Column({ type: 'timestamp', nullable: true })
    revokedAt: Date

    // Relations
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User

    @ManyToOne(() => Room, (room) => room.roleAssignments)
    @JoinColumn({ name: 'roomId', referencedColumnName: 'uuid' })
    room: Room

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'assignedBy', referencedColumnName: 'uuid' })
    assignedByUser: User
}
