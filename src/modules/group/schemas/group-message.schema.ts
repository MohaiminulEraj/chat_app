import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type GroupMessageDocument = GroupMessage & Document

@Schema({
    timestamps: true,
    collection: 'group_messages' // This will be dynamically changed based on group UUID
})
export class GroupMessage {
    @Prop({ required: true })
    senderId: string

    @Prop({ required: true })
    senderName: string

    @Prop({ required: true })
    senderAvatarUrl: string

    @Prop({ required: true })
    groupId: string

    @Prop({ required: true })
    content: string

    @Prop({
        required: true,
        enum: ['text', 'image', 'file', 'voice', 'video', 'gif', 'sticker'],
        default: 'text'
    })
    messageType: string

    @Prop({ type: Object, default: {} })
    metadata: Record<string, any> // For file URLs, dimensions, etc.

    @Prop({ default: false })
    isEdited: boolean

    @Prop({ default: false })
    isDeleted: boolean

    @Prop({ type: [String], default: [] })
    readBy: string[] // Array of user IDs who have read this message

    @Prop({ type: [String], default: [] })
    deliveredTo: string[] // Array of user IDs who have received this message

    @Prop()
    replyToMessageId: string // Reference to another message if this is a reply

    @Prop({ type: Object })
    replyToMessage: {
        messageId: string
        content: string
        senderName: string
        messageType: string
    }

    @Prop({ default: Date.now })
    timestamp: Date

    @Prop()
    editedAt: Date
}

export const GroupMessageSchema = SchemaFactory.createForClass(GroupMessage)

// Add indexes for better performance
GroupMessageSchema.index({ groupId: 1, timestamp: -1 })
GroupMessageSchema.index({ senderId: 1, timestamp: -1 })
GroupMessageSchema.index({ timestamp: -1 })
GroupMessageSchema.index({ readBy: 1 })
GroupMessageSchema.index({ deliveredTo: 1 })
