import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm'

export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    VIDEO = 'video',
    VOICE = 'voice',
    FILE = 'file',
    GIFT = 'gift'
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId'])
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'uuid' })
    @Index()
    conversationId: string

    @Column({ type: 'uuid' })
    @Index()
    senderId: string

    @Column({
        type: 'enum',
        enum: MessageType,
        default: MessageType.TEXT
    })
    type: MessageType

    @Column({ type: 'text' })
    content: string

    @Column('jsonb', { nullable: true })
    metadata?: {
        fileName?: string
        fileSize?: number
        mimeType?: string
        duration?: number
        thumbnailUrl?: string
        giftId?: string
    }

    @Column({ type: 'uuid', nullable: true })
    replyToId?: string

    @Column('text', { array: true, default: [] })
    readBy: string[]

    @Column('text', { array: true, default: [] })
    deletedFor: string[]

    @Column({ default: false })
    isEdited: boolean

    @Column({ type: 'timestamp', nullable: true })
    editedAt?: Date

    @Column('jsonb', { nullable: true })
    reactions?: Record<string, string[]>

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
