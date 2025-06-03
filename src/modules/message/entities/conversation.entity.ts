import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index } from 'typeorm'

export enum ConversationType {
    DIRECT = 'direct',
    GROUP = 'group'
}

@Entity('conversations')
@Index(['type'])
export class Conversation extends CustomBaseEntity {
    @Column({
        type: 'enum',
        enum: ConversationType
    })
    type: ConversationType

    @Column('uuid', { array: true })
    participantIds: string[]

    @Column('uuid', { nullable: true })
    groupId: string

    @Column({ nullable: true })
    lastMessageId: string

    @Column({ type: 'timestamp', nullable: true })
    lastMessageAt: Date

    @Column({ default: 0 })
    messageCount: number
}
