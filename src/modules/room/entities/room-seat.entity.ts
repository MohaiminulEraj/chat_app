import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { Room } from './room.entity'

@Entity('room_seats')
@Unique(['roomId', 'seatIndex']) // Ensure unique seat per room
@Index(['roomId', 'seatIndex']) // Index for efficient seat queries
export class RoomSeat extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    roomId: string

    @Column({ type: 'int' })
    seatIndex: number // -1 for admin seat, 0 to maxSeats - 1 for regular seats

    @Column({ default: false })
    isLocked: boolean

    @Column({ type: 'uuid', nullable: true })
    lockedBy: string // Who locked this seat (only host/owner can lock)

    @Column({ type: 'timestamp', nullable: true })
    lockedAt: Date

    @Column({ name: 'is_admin_seat', default: false })
    isAdminSeat: boolean // True for seat index -1

    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    metadata?: any // Additional seat metadata

    // Relations
    @ManyToOne(() => Room)
    @JoinColumn({ name: 'roomId', referencedColumnName: 'uuid' })
    room: Room

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'lockedBy', referencedColumnName: 'uuid' })
    lockedByUser: User
}
