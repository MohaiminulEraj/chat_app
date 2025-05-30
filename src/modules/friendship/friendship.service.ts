import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../user/entities/user.entity'
import { Friendship, FriendshipStatus } from './entities/friendship.entity'

@Injectable()
export class FriendshipService {
    constructor(
        @InjectRepository(Friendship)
        private friendshipRepository: Repository<Friendship>,
        @InjectRepository(User)
        private userRepository: Repository<User>
    ) {}

    async sendFriendRequest(
        userUuid: string,
        friendUuid: string
    ): Promise<Friendship> {
        console.log(`Sending friend request from ${userUuid} to ${friendUuid}`)
        if (userUuid === friendUuid) {
            throw new ConflictException(
                'Cannot send friend request to yourself'
            )
        }

        // Find users by UUID, not by id
        const user = await this.userRepository.findOne({
            where: { uuid: userUuid }
        })
        const friend = await this.userRepository.findOne({
            where: { uuid: friendUuid }
        })

        if (!user || !friend) {
            throw new NotFoundException('User not found')
        }

        // Check if friendship already exists using userId and friendId
        const existingFriendship = await this.friendshipRepository.findOne({
            where: [
                { userId: user.uuid, friendId: friend.uuid },
                { userId: friend.uuid, friendId: user.uuid }
            ]
        })

        if (existingFriendship) {
            throw new ConflictException('Friend request already exists')
        }

        // Create friendship with user UUIDs
        const friendship = this.friendshipRepository.create({
            userId: user.uuid,
            friendId: friend.uuid,
            status: FriendshipStatus.PENDING
        })

        return await this.friendshipRepository.save(friendship)
    }

    async acceptFriendRequest(
        friendshipId: string,
        userUuid: string
    ): Promise<Friendship> {
        const friendship = await this.friendshipRepository.findOne({
            where: { uuid: friendshipId }
        })

        if (!friendship) {
            throw new NotFoundException('Friend request not found')
        }

        if (friendship.friendId !== userUuid) {
            throw new ForbiddenException(
                'You can only accept friend requests sent to you'
            )
        }

        friendship.status = FriendshipStatus.ACCEPTED
        return await this.friendshipRepository.save(friendship)
    }

    async declineFriendRequest(
        friendshipId: string,
        userUuid: string
    ): Promise<void> {
        const friendship = await this.friendshipRepository.findOne({
            where: { uuid: friendshipId }
        })

        if (!friendship) {
            throw new NotFoundException('Friend request not found')
        }

        if (friendship.friendId !== userUuid) {
            throw new ForbiddenException(
                'You can only decline friend requests sent to you'
            )
        }

        await this.friendshipRepository.remove(friendship)
    }

    async getFriends(userUuid: string): Promise<Friendship[]> {
        return this.friendshipRepository.find({
            where: [
                { userId: userUuid, status: FriendshipStatus.ACCEPTED },
                { friendId: userUuid, status: FriendshipStatus.ACCEPTED }
            ],
            relations: ['user', 'friend']
        })
    }

    async getPendingRequests(
        userUuid: string
    ): Promise<{ sent: Friendship[]; received: Friendship[] }> {
        const sent = await this.friendshipRepository.find({
            where: { userId: userUuid, status: FriendshipStatus.PENDING },
            relations: ['friend']
        })

        const received = await this.friendshipRepository.find({
            where: { friendId: userUuid, status: FriendshipStatus.PENDING },
            relations: ['user']
        })

        return { sent, received }
    }

    async removeFriend(userUuid: string, friendUuid: string): Promise<void> {
        const friendship = await this.friendshipRepository.findOne({
            where: [
                {
                    userId: userUuid,
                    friendId: friendUuid,
                    status: FriendshipStatus.ACCEPTED
                },
                {
                    userId: friendUuid,
                    friendId: userUuid,
                    status: FriendshipStatus.ACCEPTED
                }
            ]
        })

        if (!friendship) {
            throw new NotFoundException('Friendship not found')
        }

        await this.friendshipRepository.remove(friendship)
    }

    async blockUser(
        userUuid: string,
        blockedUserUuid: string
    ): Promise<Friendship> {
        if (userUuid === blockedUserUuid) {
            throw new ConflictException('Cannot block yourself')
        }
        // Remove existing friendship if any
        const existingFriendship = await this.friendshipRepository.findOne({
            where: [
                { userId: userUuid, friendId: blockedUserUuid },
                { userId: blockedUserUuid, friendId: userUuid }
            ]
        })

        if (existingFriendship) {
            await this.friendshipRepository.remove(existingFriendship)
        }

        // Create block relationship
        const blockRelationship = this.friendshipRepository.create({
            userId: userUuid,
            friendId: blockedUserUuid,
            status: FriendshipStatus.BLOCKED,
            blockedBy: userUuid // Store who blocked whom
        })

        return this.friendshipRepository.save(blockRelationship)
    }

    async unblockUser(
        userUuid: string,
        blockedUserUuid: string
    ): Promise<void> {
        if (userUuid === blockedUserUuid) {
            throw new ConflictException('Cannot unblock yourself')
        }

        const blockRelationship = await this.friendshipRepository.findOne({
            where: {
                userId: userUuid,
                friendId: blockedUserUuid,
                status: FriendshipStatus.BLOCKED,
                blockedBy: userUuid // Ensure only the blocker can unblock
            }
        })

        if (!blockRelationship) {
            throw new NotFoundException(
                'Block relationship not found or you did not block this user'
            )
        }

        await this.friendshipRepository.remove(blockRelationship)
    }

    async getBlockedUsers(userUuid: string): Promise<Friendship[]> {
        return this.friendshipRepository.find({
            where: { userId: userUuid, status: FriendshipStatus.BLOCKED },
            relations: ['friend']
        })
    }
}
