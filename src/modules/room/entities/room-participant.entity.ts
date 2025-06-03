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

@Entity('room_participants')
@Unique(['userId', 'roomId'])
@Index(['roomId', 'userId'])
export class RoomParticipant extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    userId: string

    @Column({ type: 'uuid' })
    roomId: string

    @Column({ default: false })
    isMuted: boolean

    @Column({ default: false })
    isDeafened: boolean // User has muted their own audio output for this room

    @Column({ default: false })
    isSharingScreen: boolean

    @Column({ default: false })
    isSharingVideo: boolean

    @Column({ nullable: true }) // Add seatNumber property
    seatNumber: number

    @Column({ default: false }) // Add isVideoOn property
    isVideoOn: boolean

    @Column({ default: false }) // Add isSpeaking property
    isSpeaking: boolean

    @CreateDateColumn()
    joinedAt: Date

    // Relations
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User

    @ManyToOne(() => Room, (room) => room.participants)
    @JoinColumn({ name: 'roomId', referencedColumnName: 'uuid' })
    room: Room
}
