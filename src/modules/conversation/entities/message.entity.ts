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
    AUDIO = 'audio',
    IMAGE = 'image',
    VIDEO = 'video',
    FILE = 'file',
    CALL = 'call',
    VOICE = 'voice',
    GIFT = 'gift',
    STICKER = 'sticker',
    GIF = 'gif'
}

export enum CallType {
    VOICE = 'voice',
    VIDEO = 'video'
}

export enum MessageStatus {
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read'
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId', 'createdAt'])
@Index(['status'])
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'uuid' })
    @Index()
    senderId: string

    @Column({ type: 'uuid' })
    @Index()
    conversationId: string

    @Column({
        type: 'enum',
        enum: MessageType,
        default: MessageType.TEXT
    })
    type: MessageType

    @Column({ type: 'text', nullable: true })
    content: string

    @Column({ nullable: true })
    fileUrl?: string

    @Column({ nullable: true })
    fileName?: string

    @Column({ type: 'bigint', nullable: true })
    fileSize?: number

    @Column({ type: 'int', nullable: true })
    duration?: number // For audio/video messages

    @Column({ nullable: true })
    thumbnail?: string // For video messages

    @Column({
        type: 'enum',
        enum: MessageStatus,
        default: MessageStatus.SENT
    })
    status: MessageStatus

    @Column('text', { array: true, default: [] })
    readBy: string[] // User IDs who read the message

    @Column('text', { array: true, default: [] })
    deliveredTo: string[] // User IDs who received the message

    @Column('text', { array: true, default: [] })
    deletedFor: string[] // User IDs who deleted this message

    @Column({ type: 'uuid', nullable: true })
    replyTo?: string // Message ID for replies

    @Column({ default: false })
    isEdited: boolean

    @Column({ type: 'timestamp', nullable: true })
    editedAt?: Date

    @Column({ default: false })
    isDeleted: boolean

    @Column({ type: 'timestamp', nullable: true })
    deletedAt?: Date

    // For call messages
    @Column({ type: 'enum', enum: CallType, nullable: true })
    callType?: CallType

    @Column({ type: 'int', nullable: true })
    callDuration?: number

    @Column({ type: 'timestamp', nullable: true })
    callEndedAt?: Date

    @Column('text', { array: true, default: [] })
    callParticipants?: string[]

    // JSON column for metadata
    @Column('jsonb', { nullable: true })
    metadata?: {
        fileName?: string
        fileSize?: number
        mimeType?: string
        duration?: number
        thumbnailUrl?: string
        giftId?: string
    }

    // JSON column for reactions
    @Column('jsonb', { nullable: true })
    reactions?: Record<string, string[]>

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}
