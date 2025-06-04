import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export enum MessageType {
    TEXT = 'text',
    AUDIO = 'audio',
    IMAGE = 'image',
    VIDEO = 'video',
    FILE = 'file',
    CALL = 'call'
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

@Schema({ timestamps: true })
export class Message extends Document {
    @Prop({ required: true })
    senderId: string

    @Prop({ required: true })
    conversationId: string

    @Prop({
        required: true,
        enum: MessageType,
        default: MessageType.TEXT
    })
    type: MessageType

    @Prop()
    content: string

    @Prop()
    fileUrl?: string

    @Prop()
    fileName?: string

    @Prop()
    fileSize?: number

    @Prop()
    duration?: number // For audio/video messages

    @Prop()
    thumbnail?: string // For video messages

    @Prop({
        enum: MessageStatus,
        default: MessageStatus.SENT
    })
    status: MessageStatus

    @Prop({ type: [String], default: [] })
    readBy: string[] // User IDs who read the message

    @Prop({ type: [String], default: [] })
    deliveredTo: string[] // User IDs who received the message

    @Prop()
    replyTo?: string // Message ID for replies

    @Prop({ default: false })
    isEdited: boolean

    @Prop()
    editedAt?: Date

    @Prop({ default: false })
    isDeleted: boolean

    @Prop()
    deletedAt?: Date

    // For call messages
    @Prop({ enum: CallType })
    callType?: CallType

    @Prop()
    callDuration?: number

    @Prop()
    callEndedAt?: Date

    @Prop({ type: [String], default: [] })
    callParticipants?: string[]
}

export const MessageSchema = SchemaFactory.createForClass(Message)

// Indexes for better query performance
MessageSchema.index({ conversationId: 1, createdAt: -1 })
MessageSchema.index({ senderId: 1 })
MessageSchema.index({ status: 1 })
