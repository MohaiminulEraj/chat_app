import {
    ForbiddenException,
    Injectable,
    NotFoundException
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { InjectRepository } from '@nestjs/typeorm'
import { Model } from 'mongoose'
import { In, Repository } from 'typeorm'
import { CreateMessageDto } from './dto/create-message.dto'
import { Conversation, ConversationType } from './entities/conversation.entity'
import { Message, MessageDocument } from './schemas/message.schema'

@Injectable()
export class MessageService {
    constructor(
        @InjectRepository(Conversation)
        private conversationRepository: Repository<Conversation>,
        @InjectModel(Message.name)
        private messageModel: Model<MessageDocument>
    ) {}

    async createMessage(
        userId: string,
        createMessageDto: CreateMessageDto
    ): Promise<Message> {
        // Verify user is participant in conversation
        const conversation = await this.conversationRepository.findOne({
            where: { uuid: createMessageDto.conversationId }
        })

        if (!conversation) {
            throw new NotFoundException('Conversation not found')
        }

        if (!conversation.participantIds.includes(userId)) {
            throw new ForbiddenException(
                'You are not a participant in this conversation'
            )
        }

        // Create message in MongoDB
        const message = new this.messageModel({
            ...createMessageDto,
            senderId: userId
        })

        const savedMessage = await message.save()

        // Update conversation metadata
        await this.conversationRepository.update(conversation.id, {
            lastMessageId: savedMessage.id,
            lastMessageAt: new Date(),
            messageCount: conversation.messageCount + 1
        })

        return savedMessage
    }

    async getConversationMessages(
        conversationId: string,
        userId: string,
        limit: number = 50,
        before?: string
    ): Promise<Message[]> {
        // Verify user is participant
        const conversation = await this.conversationRepository.findOne({
            where: { uuid: conversationId }
        })

        if (!conversation || !conversation.participantIds.includes(userId)) {
            throw new ForbiddenException('Access denied')
        }

        const query: any = {
            conversationId,
            deletedFor: { $nin: [userId] }
        }

        if (before) {
            const beforeMessage = await this.messageModel.findById(before)
            if (beforeMessage) {
                query.createdAt = { $lt: beforeMessage.createdAt }
            }
        }

        return this.messageModel
            .find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec()
    }

    async createConversation(
        type: ConversationType,
        participantIds: string[],
        groupId?: string
    ): Promise<Conversation> {
        // Check if direct conversation already exists
        if (type === ConversationType.DIRECT && participantIds.length === 2) {
            const existing = await this.conversationRepository.findOne({
                where: {
                    type: ConversationType.DIRECT,
                    participantIds: In([
                        participantIds,
                        [participantIds[1], participantIds[0]]
                    ])
                }
            })

            if (existing) {
                return existing
            }
        }

        const conversation = this.conversationRepository.create({
            type,
            participantIds,
            groupId
        })

        return this.conversationRepository.save(conversation)
    }

    async getUserConversations(userId: string): Promise<Conversation[]> {
        return this.conversationRepository
            .createQueryBuilder('conversation')
            .where(':userId = ANY(conversation.participantIds)', { userId })
            .orderBy('conversation.lastMessageAt', 'DESC')
            .getMany()
    }

    async markMessagesAsRead(
        userId: string,
        messageIds: string[]
    ): Promise<void> {
        await this.messageModel.updateMany(
            {
                _id: { $in: messageIds },
                readBy: { $nin: [userId] }
            },
            {
                $push: { readBy: userId }
            }
        )
    }

    async deleteMessageForUser(
        messageId: string,
        userId: string
    ): Promise<void> {
        const message = await this.messageModel.findById(messageId)

        if (!message) {
            throw new NotFoundException('Message not found')
        }

        // Verify user is participant
        const conversation = await this.conversationRepository.findOne({
            where: { uuid: message.conversationId }
        })

        if (!conversation || !conversation.participantIds.includes(userId)) {
            throw new ForbiddenException('Access denied')
        }

        await this.messageModel.updateOne(
            { _id: messageId },
            { $push: { deletedFor: userId } }
        )
    }

    async editMessage(
        messageId: string,
        userId: string,
        content: string
    ): Promise<Message> {
        const message = await this.messageModel.findById(messageId)

        if (!message) {
            throw new NotFoundException('Message not found')
        }

        if (message.senderId !== userId) {
            throw new ForbiddenException('You can only edit your own messages')
        }

        message.content = content
        message.isEdited = true
        message.editedAt = new Date()

        return message.save()
    }

    async addReaction(
        messageId: string,
        userId: string,
        emoji: string
    ): Promise<void> {
        const message = await this.messageModel.findById(messageId)

        if (!message) {
            throw new NotFoundException('Message not found')
        }

        // Initialize reactions if not exists
        if (!message.reactions) {
            message.reactions = {}
        }

        // Initialize emoji array if not exists
        if (!message.reactions[emoji]) {
            message.reactions[emoji] = []
        }

        // Add user if not already reacted
        if (!message.reactions[emoji].includes(userId)) {
            message.reactions[emoji].push(userId)
            await message.save()
        }
    }

    async removeReaction(
        messageId: string,
        userId: string,
        emoji: string
    ): Promise<void> {
        const message = await this.messageModel.findById(messageId)

        if (!message) {
            throw new NotFoundException('Message not found')
        }

        if (message.reactions && message.reactions[emoji]) {
            message.reactions[emoji] = message.reactions[emoji].filter(
                (id) => id !== userId
            )

            // Remove emoji key if no users
            if (message.reactions[emoji].length === 0) {
                delete message.reactions[emoji]
            }

            await message.save()
        }
    }
}
