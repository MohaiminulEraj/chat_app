import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Not, Like } from 'typeorm'
import { GroupMember } from './entities/group-member.entity'
import { Group } from './entities/group.entity'
import { GroupMessage } from './entities/group-message.entity'

@Injectable()
export class GroupChatService {
    constructor(
        @InjectRepository(Group)
        private readonly groupRepository: Repository<Group>,

        @InjectRepository(GroupMember)
        private readonly groupMemberRepository: Repository<GroupMember>,

        @InjectRepository(GroupMessage)
        private readonly groupMessageRepository: Repository<GroupMessage>
    ) {}

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
    }): Promise<GroupMessage> {
        let replyToMessage = null
        if (messageData.replyToMessageId) {
            const originalMessage = await this.groupMessageRepository.findOne({
                where: { id: messageData.replyToMessageId }
            })
            if (originalMessage) {
                replyToMessage = {
                    messageId: originalMessage.id,
                    content: originalMessage.content,
                    senderName: originalMessage.senderName,
                    messageType: originalMessage.messageType
                }
            }
        }

        const message = this.groupMessageRepository.create({
            senderId: messageData.senderId,
            senderName: messageData.senderName,
            senderAvatarUrl: messageData.senderAvatarUrl,
            groupId: messageData.groupId,
            content: messageData.content,
            messageType: messageData.messageType as any,
            metadata: messageData.metadata || {},
            replyToMessage,
            replyToMessageId: messageData.replyToMessageId,
            readBy: [messageData.senderId], // Sender automatically reads their own message
            deliveredTo: []
        })

        return await this.groupMessageRepository.save(message)
    }

    async getGroupMessageHistory(
        groupId: string,
        page: number = 1,
        limit: number = 50,
        before?: string
    ): Promise<GroupMessage[]> {
        // Ensure parameters are valid numbers
        const validPage = Math.max(parseInt(String(page)) || 1, 1)
        const validLimit = Math.min(
            Math.max(parseInt(String(limit)) || 50, 1),
            100
        )
        const validSkip = (validPage - 1) * validLimit

        const queryBuilder = this.groupMessageRepository
            .createQueryBuilder('message')
            .where('message.groupId = :groupId', { groupId })
            .andWhere('message.isDeleted = false')
            .orderBy('message.timestamp', 'DESC')
            .take(validLimit)
            .skip(validSkip)

        if (before) {
            // Get messages before a specific message ID
            const beforeMessage = await this.groupMessageRepository.findOne({
                where: { id: before }
            })
            if (beforeMessage) {
                queryBuilder.andWhere('message.timestamp < :beforeTimestamp', {
                    beforeTimestamp: beforeMessage.timestamp
                })
            }
        }

        return await queryBuilder.getMany()
    }

    async markMessagesAsRead(
        groupId: string,
        messageIds: string[],
        userId: string
    ): Promise<void> {
        await this.groupMessageRepository
            .createQueryBuilder()
            .update(GroupMessage)
            .set({
                readBy: () => `array_append("readBy", '${userId}')`
            })
            .where('id IN (:...messageIds)', { messageIds })
            .andWhere('groupId = :groupId', { groupId })
            .andWhere('NOT (:userId = ANY("readBy"))', { userId })
            .execute()
    }

    async deleteMessage(
        groupId: string,
        messageId: string,
        userId: string
    ): Promise<boolean> {
        const message = await this.groupMessageRepository.findOne({
            where: { id: messageId, groupId }
        })

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

        await this.groupMessageRepository.update(messageId, {
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
    ): Promise<GroupMessage | null> {
        const message = await this.groupMessageRepository.findOne({
            where: { id: messageId, groupId }
        })

        if (!message || message.senderId !== userId || message.isDeleted) {
            return null
        }

        // Can only edit within 15 minutes of sending
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
        if (message.timestamp < fifteenMinutesAgo) {
            return null
        }

        message.content = newContent
        message.isEdited = true
        message.editedAt = new Date()

        return await this.groupMessageRepository.save(message)
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
            userRole: member.role.name, // Add userRole for consistency
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

    async getUserRole(groupId: string, userId: string): Promise<string | null> {
        const member = await this.groupMemberRepository.findOne({
            where: { groupId, userId },
            relations: ['role']
        })

        return member?.role?.name || null
    }

    async getUnreadMessageCount(
        groupId: string,
        userId: string
    ): Promise<number> {
        return await this.groupMessageRepository
            .createQueryBuilder('message')
            .where('message.groupId = :groupId', { groupId })
            .andWhere('message.isDeleted = false')
            .andWhere('message.senderId != :userId', { userId })
            .andWhere('NOT (:userId = ANY(message.readBy))', { userId })
            .getCount()
    }

    async searchMessages(
        groupId: string,
        searchTerm: string,
        limit: number = 20
    ): Promise<GroupMessage[]> {
        return await this.groupMessageRepository
            .createQueryBuilder('message')
            .where('message.groupId = :groupId', { groupId })
            .andWhere('message.isDeleted = false')
            .andWhere(
                '(message.content ILIKE :searchTerm OR message.senderName ILIKE :searchTerm)',
                {
                    searchTerm: `%${searchTerm}%`
                }
            )
            .orderBy('message.timestamp', 'DESC')
            .limit(limit)
            .getMany()
    }

    async getMessageStats(groupId: string): Promise<{
        totalMessages: number
        totalMembers: number
        activeToday: number
    }> {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const [totalMessages, totalMembers, activeSenders] = await Promise.all([
            this.groupMessageRepository.count({
                where: { groupId, isDeleted: false }
            }),
            this.groupMemberRepository.count({ where: { groupId } }),
            this.groupMessageRepository
                .createQueryBuilder('message')
                .select('DISTINCT message.senderId')
                .where('message.groupId = :groupId', { groupId })
                .andWhere('message.timestamp >= :today', { today })
                .andWhere('message.isDeleted = false')
                .getRawMany()
        ])

        return {
            totalMessages,
            totalMembers,
            activeToday: activeSenders.length
        }
    }
}
