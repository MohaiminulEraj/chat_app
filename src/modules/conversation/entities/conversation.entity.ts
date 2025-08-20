import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm'
import { Group } from '../../group/entities/group.entity'
import { User } from '../../user/entities/user.entity'

export enum ConversationType {
    DIRECT = 'direct',
    GROUP = 'group',
    ROOM = 'room'
}

@Entity('conversations')
@Index(['type', 'participantIds'])
export class Conversation extends CustomBaseEntity {
    @Column({
        type: 'enum',
        enum: ConversationType
    })
    type: ConversationType

    @Column()
    collectionName: string // PostgreSQL table name for additional metadata

    @Column('simple-array')
    participantIds: string[] // User UUIDs

    @Column({ nullable: true })
    groupId?: string

    @Column({ nullable: true })
    roomId?: string

    @Column({ default: 0 })
    messageCount: number

    @Column({ type: 'timestamp', nullable: true })
    lastMessageAt: Date

    @Column({ nullable: true })
    lastMessagePreview: string

    // Relations
    @ManyToOne(() => Group, { nullable: true })
    @JoinColumn({ name: 'groupId' })
    group?: Group

    @ManyToOne(() => User, { nullable: true })
    lastMessageBy?: User
}
