import {
    ForbiddenException,
    Injectable,
    NotFoundException
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { InjectRepository } from '@nestjs/typeorm'
import { Model } from 'mongoose'
import { Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { User } from '../user/entities/user.entity'
import { UserService } from '../user/user.service'
import { Conversation, ConversationType } from './entities/conversation.entity'
import { Message, MessageType } from './schemas/message.schema'

@Injectable()
export class ConversationService {
    constructor(
        @InjectRepository(Conversation)
        private conversationRepository: Repository<Conversation>,
        @InjectModel(Message.name)
        private messageModel: Model<Message>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private userService: UserService
    ) {}

    async getOrCreateDirectConversation(
        userId1: string,
        userId2: string
    ): Promise<Conversation> {
        // Sort user IDs to ensure consistent ordering
        const sortedIds = [userId1, userId2].sort()

        // Check if conversation exists
        let conversation = await this.conversationRepository
            .createQueryBuilder('conversation')
            .where('conversation.type = :type', {
                type: ConversationType.DIRECT
            })
            .andWhere('conversation.participantIds IS NOT NULL')
            .andWhere(
                '(conversation.participantIds = :exactMatch OR ' +
                'conversation.participantIds = :reverseMatch)',
                {
                    exactMatch: sortedIds.join(','),
                    reverseMatch: [...sortedIds].reverse().join(',')
                }
            )
            .getOne()

        if (!conversation) {
            // Create new conversation
            const collectionName = `conv_${uuidv4().replace(/-/g, '')}`

            conversation = this.conversationRepository.create({
                type: ConversationType.DIRECT,
                collectionName,
                participantIds: sortedIds,
                lastMessageAt: new Date()
            })

            conversation = await this.conversationRepository.save(conversation)
        }

        return conversation
    }

    async getConversation(conversationId: string): Promise<Conversation> {
        const conversation = await this.conversationRepository.findOne({
            where: { uuid: conversationId }
        })

        if (!conversation) {
            throw new NotFoundException('Conversation not found')
        }

        return conversation
    }

    async getUserConversations(userId: string): Promise<Conversation[]> {
        return this.conversationRepository
            .createQueryBuilder('conversation')
            .where('conversation.participantIds IS NOT NULL')
            .andWhere('conversation.participantIds != \'\'')
            .andWhere(
                '(conversation.participantIds = :exactUserId OR ' +
                'conversation.participantIds LIKE :userIdStart OR ' +
                'conversation.participantIds LIKE :userIdMiddle OR ' +
                'conversation.participantIds LIKE :userIdEnd)',
                {
                    exactUserId: userId,
                    userIdStart: `${userId},%`,
                    userIdMiddle: `%,${userId},%`,
                    userIdEnd: `%,${userId}`
                }
            )
            .orderBy('conversation.lastMessageAt', 'DESC')
            .getMany()
    }

    async createMessage(data: {
        conversationId: string
        senderId: string
        type: MessageType
        content?: string
        fileUrl?: string
        replyTo?: string
    }): Promise<Message> {
        const conversation = await this.getConversation(data.conversationId)

        // Verify sender is participant
        if (!conversation.participantIds || !conversation.participantIds.includes(data.senderId)) {
            throw new ForbiddenException(
                'You are not a participant of this conversation'
            )
        }

        // Create message in MongoDB
        const message = new this.messageModel({
            ...data,
            status: 'sent',
            readBy: [data.senderId], // Sender has read their own message
            deliveredTo: [data.senderId]
        })

        const savedMessage = await message.save()

        // Update conversation metadata
        await this.conversationRepository.update(conversation.uuid, {
            lastMessageAt: new Date(),
            lastMessagePreview:
                data.type === MessageType.TEXT
                    ? data.content?.substring(0, 100)
                    : `[${data.type}]`,
            messageCount: conversation.messageCount + 1
        })

        return savedMessage
    }

    async getMessages(
        conversationId: string,
        userId: string,
        limit: number = 50,
        before?: string
    ): Promise<Message[]> {
        const conversation = await this.getConversation(conversationId)

        // Verify user is participant
        if (!conversation.participantIds || !conversation.participantIds.includes(userId)) {
            throw new ForbiddenException(
                'You are not a participant of this conversation'
            )
        }

        const query = this.messageModel
            .find({
                conversationId,
                isDeleted: false
            })
            .sort({ createdAt: -1 })
            .limit(limit)

        if (before) {
            const beforeTime = new Date(before).getTime()
            query.where('createdAt').lt(beforeTime)
        }

        return query.exec()
    }

    async markMessagesAsRead(
        conversationId: string,
        messageIds: string[],
        userId: string
    ): Promise<void> {
        const conversation = await this.getConversation(conversationId)

        // Verify user is participant
        if (!conversation.participantIds || !conversation.participantIds.includes(userId)) {
            throw new ForbiddenException(
                'You are not a participant of this conversation'
            )
        }

        await this.messageModel.updateMany(
            {
                _id: { $in: messageIds },
                conversationId,
                senderId: { $ne: userId }
            },
            {
                $addToSet: { readBy: userId },
                $set: { status: 'read' }
            }
        )
    }

    async deleteMessage(
        conversationId: string,
        messageId: string,
        userId: string
    ): Promise<void> {
        const message = await this.messageModel.findOne({
            _id: messageId,
            conversationId
        })

        if (!message) {
            throw new NotFoundException('Message not found')
        }

        if (message.senderId !== userId) {
            throw new ForbiddenException(
                'You can only delete your own messages'
            )
        }

        message.isDeleted = true
        message.deletedAt = new Date()
        await message.save()
    }

    async editMessage(
        conversationId: string,
        messageId: string,
        userId: string,
        newContent: string
    ): Promise<Message> {
        const message = await this.messageModel.findOne({
            _id: messageId,
            conversationId
        })

        if (!message) {
            throw new NotFoundException('Message not found')
        }

        if (message.senderId !== userId) {
            throw new ForbiddenException('You can only edit your own messages')
        }

        if (message.type !== MessageType.TEXT) {
            throw new ForbiddenException('Only text messages can be edited')
        }

        message.content = newContent
        message.isEdited = true
        message.editedAt = new Date()

        return message.save()
    }

    async updateUserStatus(userId: string, status: string): Promise<void> {
        await this.userService.updateStatus(userId, status as any)
    }

    async getOfflineParticipants(
        conversationId: string,
        excludeUserId: string
    ): Promise<User[]> {
        const conversation = await this.getConversation(conversationId)

        const offlineUserIds = (conversation.participantIds || []).filter(
            (id) => id !== excludeUserId
        )

        return this.userRepository
            .createQueryBuilder('user')
            .where('user.uuid IN (:...ids)', { ids: offlineUserIds })
            .andWhere('user.status != :status', { status: 'online' })
            .getMany()
    }
}
