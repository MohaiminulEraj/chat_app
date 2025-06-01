import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    VIDEO = 'video',
    VOICE = 'voice',
    FILE = 'file',
    GIFT = 'gift'
}

export type MessageDocument = Message & Document

@Schema({ timestamps: true })
export class Message {
    @Prop({ required: true })
    conversationId: string

    @Prop({ required: true })
    senderId: string

    @Prop({ required: true, enum: MessageType })
    type: MessageType

    @Prop({ required: true })
    content: string

    @Prop({ type: Object })
    metadata?: {
        fileName?: string
        fileSize?: number
        mimeType?: string
        duration?: number
        thumbnailUrl?: string
        giftId?: string
    }

    @Prop()
    replyToId?: string

    @Prop({ type: [String], default: [] })
    readBy: string[]

    @Prop({ type: [String], default: [] })
    deletedFor: string[]

    @Prop({ default: false })
    isEdited: boolean

    @Prop()
    editedAt?: Date

    @Prop({ type: Object })
    reactions?: Record<string, string[]>

    // Mongoose will automatically add these with timestamps: true
    createdAt?: Date
    updatedAt?: Date
}

export const MessageSchema = SchemaFactory.createForClass(Message)

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: -1 })
MessageSchema.index({ senderId: 1 })
