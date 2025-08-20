import {
    ForbiddenException,
    Injectable,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { User } from '../user/entities/user.entity'
import { UserService } from '../user/user.service'
import { Conversation, ConversationType } from './entities/conversation.entity'
import { Message, MessageType, MessageStatus } from './entities/message.entity'

export interface ConversationResponse {
    id: number
    uuid: string
    type: ConversationType
    participantIds: string[]
    messageCount: number
    lastMessageAt: Date
    lastMessagePreview: string
    // Enhanced fields for API response
    avatar: string
    name: string
    lastMessage: string
    lastMessageTime: Date
}

@Injectable()
export class ConversationService {
    constructor(
        @InjectRepository(Conversation)
        private conversationRepository: Repository<Conversation>,
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
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

    async findConversationBetweenUsers(
        userId1: string,
        userId2: string
    ): Promise<Conversation | null> {
        // Sort user IDs to ensure consistent ordering
        const sortedIds = [userId1, userId2].sort()

        // Check if conversation exists
        const conversation = await this.conversationRepository
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

        return conversation
    }

    async getConversationIdBetweenUsers(
        userId1: string,
        userId2: string,
        createIfNotExists: boolean = false
    ): Promise<{
        conversationId: string
        exists: boolean
        conversation?: Conversation
    }> {
        // First try to find existing conversation
        let conversation = await this.findConversationBetweenUsers(
            userId1,
            userId2
        )

        if (conversation) {
            return {
                conversationId: conversation.uuid,
                exists: true,
                conversation
            }
        }

        // If no conversation exists and createIfNotExists is true, create one
        if (createIfNotExists) {
            conversation = await this.getOrCreateDirectConversation(
                userId1,
                userId2
            )
            return {
                conversationId: conversation.uuid,
                exists: false,
                conversation
            }
        }

        // Return null if no conversation exists and we don't want to create one
        return {
            conversationId: null,
            exists: false
        }
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

    async getUserConversations(
        userId: string
    ): Promise<ConversationResponse[]> {
        const conversations = await this.conversationRepository
            .createQueryBuilder('conversation')
            .where('conversation.participantIds IS NOT NULL')
            .andWhere("conversation.participantIds != ''")
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

        // Enhance conversations with participant details
        const enhancedConversations: ConversationResponse[] = []

        for (const conversation of conversations) {
            // For direct conversations, get the other participant's details
            let participantDetails: any = {}

            if (conversation.type === ConversationType.DIRECT) {
                // Find the other participant (not the current user)
                const otherParticipantId = conversation.participantIds.find(
                    (id) => id !== userId
                )

                if (otherParticipantId) {
                    try {
                        const otherUser =
                            await this.getUserProfile(otherParticipantId)
                        participantDetails = {
                            avatar: otherUser.avatarUrl || '',
                            name:
                                otherUser.displayName ||
                                otherUser.name ||
                                'Unknown User'
                        }
                    } catch (error) {
                        // If user not found, use default values
                        participantDetails = {
                            avatar: '',
                            name: 'Unknown User'
                        }
                    }
                } else {
                    participantDetails = {
                        avatar: '',
                        name: 'Unknown User'
                    }
                }
            } else {
                // For group conversations, you can customize this logic
                participantDetails = {
                    avatar: '',
                    name: `Group Chat (${conversation.participantIds.length} members)`
                }
            }

            const enhancedConversation: ConversationResponse = {
                id: conversation.id,
                uuid: conversation.uuid,
                type: conversation.type,
                participantIds: conversation.participantIds,
                messageCount: conversation.messageCount,
                lastMessageAt: conversation.lastMessageAt,
                lastMessagePreview: conversation.lastMessagePreview || '',
                avatar: participantDetails.avatar,
                name: participantDetails.name,
                lastMessage:
                    conversation.lastMessagePreview || 'No messages yet',
                lastMessageTime: conversation.lastMessageAt
            }

            enhancedConversations.push(enhancedConversation)
        }

        return enhancedConversations
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
        if (
            !conversation.participantIds ||
            !conversation.participantIds.includes(data.senderId)
        ) {
            throw new ForbiddenException(
                'You are not a participant of this conversation'
            )
        }

        // Create message in PostgreSQL
        const message = this.messageRepository.create({
            ...data,
            status: MessageStatus.SENT,
            readBy: [data.senderId], // Sender has read their own message
            deliveredTo: [data.senderId]
        })

        const savedMessage = await this.messageRepository.save(message)

        // Update conversation metadata
        await this.conversationRepository.update(conversation.id, {
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
        userId: string
    ): Promise<Message[]> {
        const conversation = await this.getConversation(conversationId)

        // Verify user is participant
        if (
            !conversation.participantIds ||
            !conversation.participantIds.includes(userId)
        ) {
            throw new ForbiddenException(
                'You are not a participant of this conversation'
            )
        }

        const queryBuilder = this.messageRepository
            .createQueryBuilder('message')
            .where('message.conversationId = :conversationId', {
                conversationId
            })
            .andWhere('message.isDeleted = false')
            .andWhere('NOT (:userId = ANY(message.deletedFor))', { userId })
            .orderBy('message.createdAt', 'ASC')

        return queryBuilder.getMany()
    }

    async markMessagesAsRead(
        conversationId: string,
        messageIds: string[],
        userId: string
    ): Promise<void> {
        const conversation = await this.getConversation(conversationId)

        // Verify user is participant
        if (
            !conversation.participantIds ||
            !conversation.participantIds.includes(userId)
        ) {
            throw new ForbiddenException(
                'You are not a participant of this conversation'
            )
        }

        await this.messageRepository
            .createQueryBuilder()
            .update(Message)
            .set({
                readBy: () => `array_append("readBy", '${userId}')`,
                status: MessageStatus.READ
            })
            .where('id IN (:...messageIds)', { messageIds })
            .andWhere('conversationId = :conversationId', { conversationId })
            .andWhere('senderId != :userId', { userId })
            .andWhere('NOT (:userId = ANY("readBy"))', { userId })
            .execute()
    }

    async deleteMessage(
        conversationId: string,
        messageId: string,
        userId: string
    ): Promise<void> {
        const message = await this.messageRepository.findOne({
            where: {
                id: messageId,
                conversationId
            }
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
        await this.messageRepository.save(message)
    }

    async editMessage(
        conversationId: string,
        messageId: string,
        userId: string,
        newContent: string
    ): Promise<Message> {
        const message = await this.messageRepository.findOne({
            where: {
                id: messageId,
                conversationId
            }
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

        return this.messageRepository.save(message)
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

    async getUserProfile(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { uuid: userId, isActive: true },
            select: [
                'uuid',
                'name',
                'email',
                'displayName',
                'avatarUrl',
                'coverImage',
                'country',
                'level',
                'balance',
                'frameId',
                'frameImage',
                'badge',
                'bio'
            ]
        })

        if (!user) {
            throw new NotFoundException('User not found')
        }

        return user
    }
}
