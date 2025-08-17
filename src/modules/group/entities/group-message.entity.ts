import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm'

export enum GroupMessageType {
    TEXT = 'text',
    IMAGE = 'image',
    FILE = 'file',
    VOICE = 'voice',
    VIDEO = 'video',
    GIF = 'gif',
    STICKER = 'sticker'
}

@Entity('group_messages')
@Index(['groupId', 'createdAt'])
@Index(['senderId', 'createdAt'])
@Index(['createdAt'])
@Index(['readBy'])
@Index(['deliveredTo'])
export class GroupMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'uuid' })
    @Index()
    senderId: string

    @Column()
    senderName: string

    @Column({ default: '' })
    senderAvatarUrl: string

    @Column({ type: 'uuid' })
    @Index()
    groupId: string

    @Column({ type: 'text' })
    content: string

    @Column({
        type: 'enum',
        enum: GroupMessageType,
        default: GroupMessageType.TEXT
    })
    messageType: GroupMessageType

    @Column('jsonb', { default: {} })
    metadata: Record<string, any> // For file URLs, dimensions, etc.

    @Column({ default: false })
    isEdited: boolean

    @Column({ default: false })
    isDeleted: boolean

    @Column('text', { array: true, default: [] })
    readBy: string[] // Array of user IDs who have read this message

    @Column('text', { array: true, default: [] })
    deliveredTo: string[] // Array of user IDs who have received this message

    @Column({ type: 'uuid', nullable: true })
    replyToMessageId?: string // Reference to another message if this is a reply

    @Column('jsonb', { nullable: true })
    replyToMessage?: {
        messageId: string
        content: string
        senderName: string
        messageType: string
    }

    @CreateDateColumn()
    timestamp: Date

    @Column({ type: 'timestamp', nullable: true })
    editedAt?: Date

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
