import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { CloudinaryService } from '../cloudinary/cloudinary.service'
import { CreateGroupDto } from './dto/create-group.dto'
import { GroupMember } from './entities/group-member.entity'
import { GroupRole } from './entities/group-role.entity'
import { GroupSettings } from './entities/group-settings.entity'
import { Group } from './entities/group.entity'
import { GroupCategory } from './group.constants'

@Injectable()
export class GroupService {
    constructor(
        @InjectRepository(Group)
        private groupRepository: Repository<Group>,
        @InjectRepository(GroupMember)
        private memberRepository: Repository<GroupMember>,
        @InjectRepository(GroupRole)
        private roleRepository: Repository<GroupRole>,
        @InjectRepository(GroupSettings)
        private settingsRepository: Repository<GroupSettings>,
        private cloudinaryService: CloudinaryService
    ) {}

    async createGroup(
        ownerId: string,
        data: CreateGroupDto,
        avatarFile?: Express.Multer.File,
        flagFile?: Express.Multer.File
    ): Promise<Group> {
        // Validate members don't include owner
        if (data.memberIds && data.memberIds.includes(ownerId)) {
            throw new BadRequestException('You cannot add yourself as a member')
        }

        // Handle avatar upload if file is provided
        let avatarUrl: string | undefined
        if (avatarFile) {
            try {
                console.log('Uploading avatar to Cloudinary...')
                const uploadResult = await this.cloudinaryService.uploadImage(
                    avatarFile,
                    {
                        folder: 'group-avatars',
                        transformation: {
                            width: 500,
                            height: 500,
                            crop: 'fill'
                        }
                    }
                )
                avatarUrl = uploadResult.secure_url
                console.log('Avatar uploaded successfully:', avatarUrl)
            } catch (error) {
                console.error('Failed to upload avatar:', error)
                // Continue without avatar if upload fails
                console.log('Continuing group creation without avatar...')
            }
        }

        // Handle flag upload if file is provided
        let flagUrl: string | undefined
        if (flagFile) {
            try {
                const flagResult = await this.cloudinaryService.uploadImage(
                    flagFile,
                    {
                        folder: 'group-flags'
                    }
                )
                flagUrl = flagResult.secure_url
            } catch {
                // ignore flag upload failure
            }
        }
        // Create group
        const group = this.groupRepository.create({
            ...data,
            ownerId,
            avatarUrl,
            flagUrl,
            inviteCode: data.isPublic ? uuidv4() : null,
            lastActiveAt: new Date()
        })
        const savedGroup = await this.groupRepository.save(group)
        const groupId = savedGroup.uuid

        // Create default roles
        await this.createDefaultRoles(groupId)
        // Create group settings
        const settings = this.settingsRepository.create({
            groupId: groupId,
            allowTextMessages: true,
            allowVoiceMessages: true,
            allowImageMessages: true,
            allowVideoMessages: true,
            allowFileSharing: true,
            allowGifts: true
        })
        await this.settingsRepository.save(settings)

        // Add owner as super admin
        const ownerRole = await this.roleRepository.findOne({
            where: { groupId: groupId, name: 'Group Owner' }
        })

        const ownerMember = this.memberRepository.create({
            userId: ownerId,
            groupId: groupId,
            roleId: ownerRole.uuid
        })
        await this.memberRepository.save(ownerMember)

        // Add initial members if provided
        if (data.memberIds && data.memberIds.length > 0) {
            const memberRole = await this.roleRepository.findOne({
                where: { groupId: groupId, name: 'Member' }
            })

            const members = data.memberIds.map((userId) =>
                this.memberRepository.create({
                    userId,
                    groupId: groupId,
                    roleId: memberRole.uuid
                })
            )

            await this.memberRepository.save(members)
        }

        // Return the actual group entity
        return savedGroup
    }

    async createDefaultRoles(groupId: string): Promise<void> {
        const defaultRoles = [
            {
                groupId,
                name: 'Group Owner',
                priority: 100,
                permissions: {
                    manageGroup: true,
                    manageRoles: true,
                    manageMembers: true,
                    manageRooms: true,
                    sendMessages: true,
                    deleteMessages: true,
                    mentionEveryone: true,
                    createInvites: true,
                    kickMembers: true,
                    banMembers: true
                },
                color: '#FF0000'
            },
            {
                groupId,
                name: 'Super Admin',
                priority: 90,
                permissions: {
                    manageGroup: true,
                    manageRoles: true,
                    manageMembers: true,
                    manageRooms: true,
                    sendMessages: true,
                    deleteMessages: true,
                    mentionEveryone: true,
                    createInvites: true,
                    kickMembers: true,
                    banMembers: true
                },
                color: '#FF6B00'
            },
            {
                groupId,
                name: 'Admin',
                priority: 80,
                permissions: {
                    manageGroup: false,
                    manageRoles: false,
                    manageMembers: true,
                    manageRooms: true,
                    sendMessages: true,
                    deleteMessages: true,
                    mentionEveryone: true,
                    createInvites: true,
                    kickMembers: true,
                    banMembers: false
                },
                color: '#00FF00'
            },
            {
                groupId,
                name: 'VIP Member',
                priority: 60,
                permissions: {
                    manageGroup: false,
                    manageRoles: false,
                    manageMembers: false,
                    manageRooms: false,
                    sendMessages: true,
                    deleteMessages: false,
                    mentionEveryone: true,
                    createInvites: true,
                    kickMembers: false,
                    banMembers: false
                },
                color: '#FFD700'
            },
            {
                groupId,
                name: 'Member',
                priority: 40,
                permissions: {
                    manageGroup: false,
                    manageRoles: false,
                    manageMembers: false,
                    manageRooms: false,
                    sendMessages: true,
                    deleteMessages: false,
                    mentionEveryone: false,
                    createInvites: false,
                    kickMembers: false,
                    banMembers: false
                },
                color: '#808080'
            }
        ]
        const groupRoles = await this.roleRepository.create(defaultRoles)
        await this.roleRepository.save(groupRoles)
    }

    async transferOwnership(
        groupId: string,
        currentOwnerId: string,
        newOwnerId: string
    ): Promise<void> {
        const group = await this.groupRepository.findOne({
            where: { uuid: groupId, ownerId: currentOwnerId }
        })

        if (!group) {
            throw new ForbiddenException('You are not the owner of this group')
        }

        // Check if new owner is a member
        const newOwnerMember = await this.memberRepository.findOne({
            where: { groupId, userId: newOwnerId }
        })

        if (!newOwnerMember) {
            throw new BadRequestException(
                'New owner must be a member of the group'
            )
        }

        // Get owner role
        const ownerRole = await this.roleRepository.findOne({
            where: { groupId, name: 'Owner' }
        })

        // Update new owner's role
        newOwnerMember.roleId = ownerRole.uuid
        await this.memberRepository.save(newOwnerMember)

        // Update group owner
        group.ownerId = newOwnerId
        await this.groupRepository.save(group)

        // Change previous owner to admin
        const adminRole = await this.roleRepository.findOne({
            where: { groupId, name: 'Admin' }
        })

        const previousOwnerMember = await this.memberRepository.findOne({
            where: { groupId, userId: currentOwnerId }
        })

        if (previousOwnerMember) {
            previousOwnerMember.roleId = adminRole.uuid
            await this.memberRepository.save(previousOwnerMember)
        }
    }

    async updateGroupSettings(
        groupId: string,
        userId: string,
        settings: Partial<GroupSettings>
    ): Promise<GroupSettings> {
        // Check permissions
        const hasPermission = await this.checkPermission(
            groupId,
            userId,
            'manageGroup'
        )
        if (!hasPermission) {
            throw new ForbiddenException(
                'You do not have permission to manage group settings'
            )
        }

        const groupSettings = await this.settingsRepository.findOne({
            where: { groupId }
        })

        if (!groupSettings) {
            throw new NotFoundException('Group settings not found')
        }

        Object.assign(groupSettings, settings)
        return this.settingsRepository.save(groupSettings)
    }

    async checkPermission(
        groupId: string,
        userId: string,
        permission: string
    ): Promise<boolean> {
        const member = await this.memberRepository.findOne({
            where: { groupId, userId },
            relations: ['role']
        })

        if (!member || !member.role) {
            return false
        }

        return member.role.permissions[permission] || false
    }

    async addMember(
        groupId: string,
        adminId: string,
        newMemberId: string
    ): Promise<void> {
        // Check permissions
        const hasPermission = await this.checkPermission(
            groupId,
            adminId,
            'manageMembers'
        )
        if (!hasPermission) {
            throw new ForbiddenException(
                'You do not have permission to add members'
            )
        }

        // Check if already a member
        const existingMember = await this.memberRepository.findOne({
            where: { groupId, userId: newMemberId }
        })

        if (existingMember) {
            throw new BadRequestException('User is already a member')
        }

        // Get default member role
        const memberRole = await this.roleRepository.findOne({
            where: { groupId, name: 'Member' }
        })

        await this.memberRepository.save({
            userId: newMemberId,
            groupId,
            roleId: memberRole.uuid
        })
    }

    async removeMember(
        groupId: string,
        adminId: string,
        memberId: string
    ): Promise<void> {
        // Check permissions
        const hasPermission = await this.checkPermission(
            groupId,
            adminId,
            'kickMembers'
        )
        if (!hasPermission) {
            throw new ForbiddenException(
                'You do not have permission to remove members'
            )
        }

        // Cannot remove owner
        const group = await this.groupRepository.findOne({
            where: { uuid: groupId }
        })

        if (group.ownerId === memberId) {
            throw new BadRequestException('Cannot remove the group owner')
        }

        const member = await this.memberRepository.findOne({
            where: { groupId, userId: memberId }
        })

        if (!member) {
            throw new NotFoundException('Member not found')
        }

        await this.memberRepository.remove(member)
    }

    async updateMemberRole(
        groupId: string,
        adminId: string,
        memberId: string,
        roleId: string
    ): Promise<void> {
        // Check permissions
        const hasPermission = await this.checkPermission(
            groupId,
            adminId,
            'manageRoles'
        )
        if (!hasPermission) {
            throw new ForbiddenException(
                'You do not have permission to manage roles'
            )
        }

        const member = await this.memberRepository.findOne({
            where: { groupId, userId: memberId }
        })

        if (!member) {
            throw new NotFoundException('Member not found')
        }

        // Verify role exists
        const role = await this.roleRepository.findOne({
            where: { uuid: roleId, groupId }
        })

        if (!role) {
            throw new NotFoundException('Role not found')
        }

        member.roleId = roleId
        await this.memberRepository.save(member)
    }

    async muteMember(
        groupId: string,
        adminId: string,
        memberId: string,
        duration?: number
    ): Promise<void> {
        // Check permissions
        const hasPermission = await this.checkPermission(
            groupId,
            adminId,
            'manageMembers'
        )
        if (!hasPermission) {
            throw new ForbiddenException(
                'You do not have permission to mute members'
            )
        }

        const member = await this.memberRepository.findOne({
            where: { groupId, userId: memberId }
        })

        if (!member) {
            throw new NotFoundException('Member not found')
        }

        member.isMuted = true
        if (duration) {
            member.mutedUntil = new Date(Date.now() + duration * 60 * 1000) // duration in minutes
        }

        await this.memberRepository.save(member)
    }

    async unmuteMember(
        groupId: string,
        adminId: string,
        memberId: string
    ): Promise<void> {
        // Check permissions
        const hasPermission = await this.checkPermission(
            groupId,
            adminId,
            'manageMembers'
        )
        if (!hasPermission) {
            throw new ForbiddenException(
                'You do not have permission to unmute members'
            )
        }

        const member = await this.memberRepository.findOne({
            where: { groupId, userId: memberId }
        })

        if (!member) {
            throw new NotFoundException('Member not found')
        }

        member.isMuted = false
        member.mutedUntil = null

        await this.memberRepository.save(member)
    }

    async joinPublicGroup(
        groupId: string,
        userId: string,
        inviteCode?: string
    ): Promise<void> {
        const group = await this.groupRepository.findOne({
            where: { uuid: groupId }
        })

        if (!group) {
            throw new NotFoundException('Group not found')
        }

        if (
            !group.isPublic &&
            (!inviteCode || inviteCode !== group.inviteCode)
        ) {
            throw new ForbiddenException('Invalid invite code')
        }

        await this.addMember(groupId, group.ownerId, userId)
    }

    async leaveGroup(groupId: string, userId: string): Promise<void> {
        const group = await this.groupRepository.findOne({
            where: { uuid: groupId }
        })

        if (group.ownerId === userId) {
            throw new BadRequestException(
                'Owner cannot leave the group. Transfer ownership first.'
            )
        }

        const member = await this.memberRepository.findOne({
            where: { groupId, userId }
        })

        if (!member) {
            throw new NotFoundException('You are not a member of this group')
        }

        await this.memberRepository.remove(member)
    }

    async getGroupMembers(groupId: string): Promise<GroupMember[]> {
        return this.memberRepository.find({
            where: { groupId },
            relations: ['user', 'role'],
            order: { role: { priority: 'DESC' } }
        })
    }

    async getUserGroups(userId: string): Promise<Group[]> {
        const memberships = await this.memberRepository.find({
            where: { userId },
            relations: ['group']
        })

        return memberships.map((m) => m.group)
    }

    async updateGroupAvatar(
        groupId: string,
        userId: string,
        avatarFile: Express.Multer.File
    ): Promise<Group> {
        // Check permissions
        const hasPermission = await this.checkPermission(
            groupId,
            userId,
            'manageGroup'
        )
        if (!hasPermission) {
            throw new ForbiddenException(
                'You do not have permission to manage this group'
            )
        }

        const group = await this.groupRepository.findOne({
            where: { uuid: groupId }
        })

        if (!group) {
            throw new NotFoundException('Group not found')
        }

        // Delete old avatar if exists
        if (group.avatarUrl) {
            try {
                // Extract public_id from the URL
                const urlParts = group.avatarUrl.split('/')
                const publicIdWithExtension = urlParts[urlParts.length - 1]
                const publicId = publicIdWithExtension.split('.')[0]
                const folderPath = urlParts.slice(-2, -1)[0]
                await this.cloudinaryService.deleteFile(
                    `${folderPath}/${publicId}`
                )
            } catch (error) {
                console.error('Failed to delete old group avatar:', error)
            }
        }

        // Upload new avatar
        const uploadResult = await this.cloudinaryService.uploadImage(
            avatarFile,
            {
                folder: 'group-avatars',
                transformation: {
                    width: 500,
                    height: 500,
                    crop: 'fill'
                }
            }
        )

        group.avatarUrl = uploadResult.secure_url
        return await this.groupRepository.save(group)
    }

    // Add methods to get groups by calculated categories
    async getGroupsByCategory(
        category: GroupCategory,
        limit: number = 20
    ): Promise<Group[]> {
        switch (category) {
            case GroupCategory.POPULAR:
                return this.getPopularGroups(limit)
            case GroupCategory.RECOMMENDED:
                return this.getRecommendedGroups(limit)
            case GroupCategory.COUNTRY:
            default:
                return this.getCountryGroups(limit)
        }
    }

    async getPopularGroups(limit: number = 20): Promise<Group[]> {
        // Groups with highest user engagement (visits + active users)
        return this.groupRepository
            .createQueryBuilder('group')
            .leftJoinAndSelect('group.members', 'members')
            .leftJoinAndSelect('group.owner', 'owner')
            .addSelect(
                '(group.totalVisits + group.activeUsersCount * 10)',
                'popularity_score'
            )
            .where('group.isPublic = :isPublic', { isPublic: true })
            .orderBy('popularity_score', 'DESC')
            .limit(limit)
            .getMany()
    }

    async getRecommendedGroups(limit: number = 20): Promise<Group[]> {
        // Groups with highest gift transaction activity
        return this.groupRepository
            .createQueryBuilder('group')
            .leftJoinAndSelect('group.members', 'members')
            .leftJoinAndSelect('group.owner', 'owner')
            .where('group.isPublic = :isPublic', { isPublic: true })
            .andWhere('group.giftTransactionCount > :minTransactions', {
                minTransactions: 0
            })
            .orderBy('group.giftTransactionCount', 'DESC')
            .addOrderBy('group.totalGiftValue', 'DESC')
            .limit(limit)
            .getMany()
    }

    async getCountryGroups(limit: number = 20): Promise<Group[]> {
        // All groups grouped by country/location
        return this.groupRepository
            .createQueryBuilder('group')
            .leftJoinAndSelect('group.members', 'members')
            .leftJoinAndSelect('group.owner', 'owner')
            .where('group.isPublic = :isPublic', { isPublic: true })
            .andWhere('group.location IS NOT NULL')
            .orderBy('group.location', 'ASC')
            .addOrderBy('group.createdAt', 'DESC')
            .limit(limit)
            .getMany()
    }

    // Method to update group engagement metrics
    async updateGroupEngagement(
        groupId: string,
        type: 'visit' | 'gift_transaction',
        value?: number
    ): Promise<void> {
        const group = await this.groupRepository.findOne({
            where: { uuid: groupId }
        })
        if (!group) return

        switch (type) {
            case 'visit':
                group.totalVisits += 1
                group.lastActiveAt = new Date()
                break
            case 'gift_transaction':
                group.giftTransactionCount += 1
                if (value) {
                    group.totalGiftValue = Number(group.totalGiftValue) + value
                }
                group.lastActiveAt = new Date()
                break
        }

        await this.groupRepository.save(group)
    }

    // Method to update active users count (call this when users join/leave rooms)
    async updateActiveUsersCount(groupId: string): Promise<void> {
        const activeCount = await this.memberRepository
            .createQueryBuilder('member')
            .leftJoin('member.user', 'user')
            .where('member.groupId = :groupId', { groupId })
            .andWhere('user.status IN (:...statuses)', {
                statuses: ['online', 'away']
            })
            .getCount()

        await this.groupRepository.update(
            { uuid: groupId },
            { activeUsersCount: activeCount }
        )
    }

    async getGroupRoles(groupId: string): Promise<GroupRole[]> {
        return this.roleRepository.find({
            where: { groupId },
            order: { priority: 'DESC' }
        })
    }
}
