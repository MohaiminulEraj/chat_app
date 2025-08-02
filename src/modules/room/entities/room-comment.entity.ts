import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne
} from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { Room } from './room.entity'

@Entity('room_comments')
@Index(['roomId', 'createdAt'])
@Index(['userId', 'roomId'])
export class RoomComment extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    roomId: string

    @Column({ type: 'uuid' })
    userId: string

    @Column({ type: 'text' })
    message: string

    @Column({ type: 'varchar', length: 50, default: 'text' })
    messageType: 'text' | 'emoji' | 'sticker' | 'system' // Type of message

    @Column({ type: 'jsonb', nullable: true })
    metadata?: any // For storing additional data like sticker info, emoji reactions, etc.

    @Column({ type: 'jsonb', nullable: true, default: '{}' })
    reactions?: { [emoji: string]: string[] } // Emoji reactions with user IDs who reacted

    @Column({ default: true })
    isVisible: boolean

    @Column({ type: 'uuid', nullable: true })
    replyToId?: string // For replying to other comments

    @CreateDateColumn()
    createdAt: Date

    // Relations
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User

    @ManyToOne(() => Room)
    @JoinColumn({ name: 'roomId', referencedColumnName: 'uuid' })
    room: Room

    @ManyToOne(() => RoomComment, { nullable: true })
    @JoinColumn({ name: 'replyToId', referencedColumnName: 'uuid' })
    replyTo?: RoomComment
}
