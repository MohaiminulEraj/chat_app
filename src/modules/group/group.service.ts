import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { CloudinaryService } from '../cloudinary/cloudinary.service'
import { User } from '../user/entities/user.entity'
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
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private cloudinaryService: CloudinaryService,
        private dataSource: DataSource
    ) {}

    async createGroup(
        ownerId: string,
        data: CreateGroupDto,
        avatarFile?: Express.Multer.File,
        flagFile?: Express.Multer.File
    ): Promise<Group> {
        // Validate owner exists
        const ownerExists = await this.userRepository.findOne({
            where: { uuid: ownerId }
        })
        if (!ownerExists) {
            throw new BadRequestException('Owner user not found')
        }

        // Validate members don't include owner
        if (data.memberIds && data.memberIds.includes(ownerId)) {
            throw new BadRequestException('You cannot add yourself as a member')
        }

        // Validate all member IDs exist
        if (data.memberIds && data.memberIds.length > 0) {
            const existingUsers = await this.userRepository.find({
                where: data.memberIds.map((id) => ({ uuid: id }))
            })

            const existingUserIds = existingUsers.map((user) => user.uuid)
            const nonExistentUsers = data.memberIds.filter(
                (id) => !existingUserIds.includes(id)
            )

            if (nonExistentUsers.length > 0) {
                throw new BadRequestException(
                    `Users not found: ${nonExistentUsers.join(', ')}`
                )
            }
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

        // Use transaction for group creation to ensure data consistency
        return await this.dataSource.transaction(async (manager) => {
            // Create group
            const group = this.groupRepository.create({
                ...data,
                ownerId,
                avatarUrl,
                flagUrl,
                inviteCode: data.isPublic ? uuidv4() : null,
                lastActiveAt: new Date()
            })
            const savedGroup = await manager.save(group)
            const groupId = savedGroup.uuid

            // Create default roles
            await this.createDefaultRolesInTransaction(manager, groupId)

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
            await manager.save(settings)

            // Add owner as super admin
            const ownerRole = await manager.findOne(GroupRole, {
                where: { groupId: groupId, name: 'Group Owner' }
            })

            if (!ownerRole) {
                console.error('Failed to find owner role for group:', groupId)
                throw new BadRequestException(
                    'Failed to create owner role for group'
                )
            }

            console.log('Creating owner member with:', {
                userId: ownerId,
                groupId: groupId,
                roleId: ownerRole.uuid
            })

            const ownerMember = this.memberRepository.create({
                userId: ownerId,
                groupId: groupId,
                roleId: ownerRole.uuid
            })
            await manager.save(ownerMember)

            // Add initial members if provided
            if (data.memberIds && data.memberIds.length > 0) {
                const memberRole = await manager.findOne(GroupRole, {
                    where: { groupId: groupId, name: 'Member' }
                })

                if (!memberRole) {
                    console.error(
                        'Failed to find member role for group:',
                        groupId
                    )
                    throw new BadRequestException(
                        'Failed to create member role for group'
                    )
                }

                console.log(
                    'Creating members with role:',
                    memberRole.uuid,
                    'for users:',
                    data.memberIds
                )

                const members = data.memberIds.map((userId) => {
                    console.log('Creating member:', {
                        userId,
                        groupId: groupId,
                        roleId: memberRole.uuid
                    })
                    return this.memberRepository.create({
                        userId,
                        groupId: groupId,
                        roleId: memberRole.uuid
                    })
                })

                await manager.save(members)
            }

            // Return the saved group
            return savedGroup
        })
    }

    private async createDefaultRolesInTransaction(
        manager: any,
        groupId: string
    ): Promise<void> {
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

        try {
            const groupRoles = this.roleRepository.create(defaultRoles)
            const savedRoles = await manager.save(groupRoles)

            if (savedRoles.length !== defaultRoles.length) {
                throw new BadRequestException(
                    'Failed to create all default roles'
                )
            }
        } catch (error) {
            console.error(
                'Error creating default roles for group:',
                groupId,
                error
            )
            throw new BadRequestException(
                'Failed to create default roles for group'
            )
        }
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
        // Get the group to check if it's public or private
        const group = await this.groupRepository.findOne({
            where: { uuid: groupId }
        })

        if (!group) {
            throw new NotFoundException('Group not found')
        }

        // For private groups, only the owner can add members
        if (!group.isPublic && group.ownerId !== adminId) {
            throw new ForbiddenException(
                'Only the group owner can add members to private groups'
            )
        }

        // For public groups, any member can add members (no permission check needed)

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
        const members = await this.memberRepository.find({
            where: { groupId },
            relations: ['user', 'role'],
            order: { role: { priority: 'DESC' } }
        })

        // Add userRole information to each member
        members.forEach((member) => {
            // Add userRole to member object
            ;(member as any).userRole = member.role?.name || 'member'

            // Add userRole to user object within member
            if (member.user) {
                ;(member.user as any).userRole = member.role?.name || 'member'
            }
        })

        return members
    }

    async getUserGroups(userId: string): Promise<any[]> {
        const memberships = await this.memberRepository.find({
            where: { userId },
            relations: ['group', 'group.rooms', 'role']
        })

        return memberships.map((m) => ({
            ...m.group,
            isRoomActive: m.group.rooms && m.group.rooms.length > 0,
            userRole: m.role?.name || 'member'
        }))
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

    async getGroupDetails(groupId: string): Promise<Group | null> {
        const group = await this.groupRepository.findOne({
            where: { uuid: groupId },
            relations: [
                'owner',
                'members',
                'members.user',
                'members.role',
                'roles',
                'settings',
                'rooms'
            ],
            order: {
                members: {
                    joinedAt: 'ASC'
                },
                roles: {
                    priority: 'DESC'
                },
                rooms: {
                    createdAt: 'DESC'
                }
            }
        })

        if (!group) {
            return null
        }

        // Add userRole information to each member
        if (group.members) {
            group.members.forEach((member) => {
                // Add userRole to member object
                ;(member as any).userRole = member.role?.name || 'member'

                // Add userRole to user object within member
                if (member.user) {
                    ;(member.user as any).userRole =
                        member.role?.name || 'member'
                }
            })
        }

        return group
    }

    async getGroupById(
        groupId: string,
        includeRelations: boolean = true
    ): Promise<Group | null> {
        if (!includeRelations) {
            return this.groupRepository.findOne({
                where: { uuid: groupId }
            })
        }

        return this.getGroupDetails(groupId)
    }
}
