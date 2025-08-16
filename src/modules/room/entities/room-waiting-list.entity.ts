import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    Unique
} from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { Room } from './room.entity'

@Entity('room_waiting_list')
@Unique(['roomId', 'userId'])
@Index(['roomId', 'position'])
export class RoomWaitingList extends CustomBaseEntity {
    @Column('uuid')
    roomId: string

    @Column('uuid')
    userId: string

    @Column()
    position: number

    @CreateDateColumn()
    addedAt: Date

    // Relations
    @ManyToOne(() => Room, (room) => room.waitingList)
    @JoinColumn({ name: 'roomId', referencedColumnName: 'uuid' })
    room: Room

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User
}
