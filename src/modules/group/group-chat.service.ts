import { Injectable } from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import { InjectRepository } from '@nestjs/typeorm'
import { Connection, Model } from 'mongoose'
import { Repository } from 'typeorm'
import { GroupMember } from './entities/group-member.entity'
import { Group } from './entities/group.entity'
import {
    GroupMessage,
    GroupMessageDocument
} from './schemas/group-message.schema'

@Injectable()
export class GroupChatService {
    constructor(
        @InjectRepository(Group)
        private readonly groupRepository: Repository<Group>,

        @InjectRepository(GroupMember)
        private readonly groupMemberRepository: Repository<GroupMember>,

        @InjectModel(GroupMessage.name)
        private readonly groupMessageModel: Model<GroupMessageDocument>,

        @InjectConnection()
        private readonly mongoConnection: Connection
    ) {}

    // Get dynamic collection for group messages using group UUID
    private getGroupMessageCollection(
        groupId: string
    ): Model<GroupMessageDocument> {
        const collectionName = `group_messages_${groupId.replace(/-/g, '_')}`
        return this.mongoConnection.model<GroupMessageDocument>(
            'GroupMessage',
            this.groupMessageModel.schema,
            collectionName
        )
    }

    async verifyGroupMembership(
        userId: string,
        groupId: string
    ): Promise<boolean> {
        const membership = await this.groupMemberRepository.findOne({
            where: {
                userId,
                groupId
            }
        })
        return !!membership
    }

    async saveGroupMessage(messageData: {
        senderId: string
        senderName: string
        senderAvatarUrl: string
        groupId: string
        content: string
        messageType: string
        metadata?: any
        replyToMessageId?: string
    }): Promise<GroupMessageDocument> {
        const MessageModel = this.getGroupMessageCollection(messageData.groupId)

        let replyToMessage = null
        if (messageData.replyToMessageId) {
            const originalMessage = await MessageModel.findById(
                messageData.replyToMessageId
            )
            if (originalMessage) {
                replyToMessage = {
                    messageId: originalMessage._id.toString(),
                    content: originalMessage.content,
                    senderName: originalMessage.senderName,
                    messageType: originalMessage.messageType
                }
            }
        }

        const message = new MessageModel({
            senderId: messageData.senderId,
            senderName: messageData.senderName,
            senderAvatarUrl: messageData.senderAvatarUrl,
            groupId: messageData.groupId,
            content: messageData.content,
            messageType: messageData.messageType,
            metadata: messageData.metadata || {},
            replyToMessage,
            timestamp: new Date(),
            readBy: [messageData.senderId], // Sender automatically reads their own message
            deliveredTo: []
        })

        return await message.save()
    }

    async getGroupMessageHistory(
        groupId: string,
        page: number = 1,
        limit: number = 50,
        before?: string
    ): Promise<GroupMessageDocument[]> {
        const MessageModel = this.getGroupMessageCollection(groupId)

        let query: any = { isDeleted: false }

        if (before) {
            const beforeMessage = await MessageModel.findById(before)
            if (beforeMessage) {
                query.timestamp = { $lt: beforeMessage.timestamp }
            }
        }

        return await MessageModel.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec()
    }

    async markMessagesAsRead(
        groupId: string,
        messageIds: string[],
        userId: string
    ): Promise<void> {
        const MessageModel = this.getGroupMessageCollection(groupId)

        await MessageModel.updateMany(
            {
                _id: { $in: messageIds },
                readBy: { $ne: userId }
            },
            {
                $addToSet: { readBy: userId }
            }
        )
    }

    async deleteMessage(
        groupId: string,
        messageId: string,
        userId: string
    ): Promise<boolean> {
        const MessageModel = this.getGroupMessageCollection(groupId)

        const message = await MessageModel.findById(messageId)
        if (!message) return false

        // Check if user is the sender or has admin rights
        if (message.senderId !== userId) {
            // Check if user is group admin
            const membership = await this.groupMemberRepository.findOne({
                where: { userId, groupId },
                relations: ['role']
            })

            if (
                !membership ||
                !['admin', 'owner'].includes(
                    membership.role?.name?.toLowerCase()
                )
            ) {
                return false
            }
        }

        await MessageModel.findByIdAndUpdate(messageId, {
            isDeleted: true,
            content: 'This message was deleted',
            metadata: {}
        })

        return true
    }

    async editMessage(
        groupId: string,
        messageId: string,
        newContent: string,
        userId: string
    ): Promise<GroupMessageDocument | null> {
        const MessageModel = this.getGroupMessageCollection(groupId)

        const message = await MessageModel.findById(messageId)
        if (!message || message.senderId !== userId || message.isDeleted) {
            return null
        }

        // Can only edit within 15 minutes of sending
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
        if (message.timestamp < fifteenMinutesAgo) {
            return null
        }

        return await MessageModel.findByIdAndUpdate(
            messageId,
            {
                content: newContent,
                isEdited: true,
                editedAt: new Date()
            },
            { new: true }
        )
    }

    async getGroupMembers(groupId: string): Promise<any[]> {
        const members = await this.groupMemberRepository.find({
            where: { groupId },
            relations: ['user', 'role'],
            select: {
                user: {
                    uuid: true,
                    name: true,
                    email: true,
                    avatarUrl: true
                },
                role: {
                    name: true
                },
                joinedAt: true,
                isMuted: true
            }
        })

        return members.map((member) => ({
            uuid: member.user.uuid,
            name: member.user.name,
            email: member.user.email,
            avatarUrl: member.user.avatarUrl,
            role: member.role.name,
            joinedAt: member.joinedAt,
            isMuted: member.isMuted
        }))
    }

    async getGroupInfo(groupId: string): Promise<Group | null> {
        return await this.groupRepository.findOne({
            where: { uuid: groupId },
            relations: ['owner']
        })
    }

    async getUnreadMessageCount(
        groupId: string,
        userId: string
    ): Promise<number> {
        const MessageModel = this.getGroupMessageCollection(groupId)

        return await MessageModel.countDocuments({
            isDeleted: false,
            senderId: { $ne: userId },
            readBy: { $ne: userId }
        })
    }

    async searchMessages(
        groupId: string,
        searchTerm: string,
        limit: number = 20
    ): Promise<GroupMessageDocument[]> {
        const MessageModel = this.getGroupMessageCollection(groupId)

        return await MessageModel.find({
            isDeleted: false,
            $or: [
                { content: { $regex: searchTerm, $options: 'i' } },
                { senderName: { $regex: searchTerm, $options: 'i' } }
            ]
        })
            .sort({ timestamp: -1 })
            .limit(limit)
            .exec()
    }

    async getMessageStats(groupId: string): Promise<{
        totalMessages: number
        totalMembers: number
        activeToday: number
    }> {
        const MessageModel = this.getGroupMessageCollection(groupId)

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const [totalMessages, totalMembers, activeToday] = await Promise.all([
            MessageModel.countDocuments({ isDeleted: false }),
            this.groupMemberRepository.count({ where: { groupId } }),
            MessageModel.distinct('senderId', {
                timestamp: { $gte: today },
                isDeleted: false
            }).then((senders) => senders.length)
        ])

        return {
            totalMessages,
            totalMembers,
            activeToday
        }
    }
}
