import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { GroupMember } from 'src/modules/group/entities/group-member.entity'
import { Group } from 'src/modules/group/entities/group.entity'
import { RoomParticipant } from 'src/modules/room/entities/room-participant.entity'
import { Column, Entity, Index, OneToMany } from 'typeorm'
import { LoginLog } from '../../auth/entities/login-log.entity'
import { Friendship } from '../../friendship/entities/friendship.entity'
import { Gift } from '../../gift/entities/gift.entity'
import { AchievementItem } from '../interfaces/achievement.interface'

@Entity('users')
export class User extends CustomBaseEntity {
    @Column({ unique: true })
    @Index()
    email: string

    @Column({ type: 'varchar', select: false })
    password: string

    @Column({ nullable: true })
    displayName: string

    @Column({ nullable: true })
    avatarUrl: string

    @Column({ nullable: true })
    coverImage: string

    @Column({ nullable: true })
    bio: string

    @Column({
        type: 'enum',
        enum: ['online', 'offline', 'away', 'busy'],
        default: 'offline'
    })
    status: 'online' | 'offline' | 'away' | 'busy'

    @Column({ type: 'timestamp', nullable: true })
    lastSeenAt: Date

    @Column({ default: true })
    isActive: boolean

    // Additional fields for auth system compatibility
    @Column({ nullable: true })
    name: string

    @Column({ nullable: true })
    phoneNumber: string

    @Column({ default: false })
    isEmailVerified: boolean

    @Column({ default: false })
    isPhoneVerified: boolean

    @Column({ nullable: true })
    code: string

    @Column({ type: 'bigint', nullable: true })
    codeExpiredAt: number

    @Column({ nullable: true })
    hash: string

    @Column({ default: 'local' })
    authProvider: string

    @Column({ default: 'user' })
    userType: string

    // Achievement system fields
    @Column({ nullable: true })
    country: string

    @Column({ type: 'int', default: 0 })
    level: number

    // Currency system - Two types of currency
    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    binsBalance: number

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    diamondBalance: number

    @Column({ nullable: true })
    frameId: string

    @Column({ nullable: true })
    frameImage: string

    @Column({ type: 'jsonb', nullable: true })
    badge: string[]

    @Column({ type: 'jsonb', nullable: true })
    purchasedGifts: AchievementItem[]

    @Column({ type: 'jsonb', nullable: true })
    entryEffects: AchievementItem[]

    @Column({ type: 'jsonb', nullable: true })
    frames: AchievementItem[]

    @Column({ type: 'jsonb', nullable: true })
    settings: {
        notifications?: boolean
        privacy?: {
            showOnlineStatus?: boolean
            showLastSeen?: boolean
        }
    }

    // Relations
    @OneToMany(() => Friendship, (friendship) => friendship.user)
    friendships: Friendship[]

    @OneToMany(() => LoginLog, (loginLog) => loginLog.user)
    loginLogs: LoginLog[]

    @OneToMany(() => GroupMember, (member) => member.user)
    groupMemberships: GroupMember[]

    @OneToMany(() => Group, (group) => group.owner)
    ownedGroups: Group[]

    @OneToMany(() => RoomParticipant, (participant) => participant.user)
    roomParticipations: RoomParticipant[]

    @OneToMany(() => Gift, (gift) => gift.sender)
    sentGifts: Gift[]

    @OneToMany(() => Gift, (gift) => gift.receiver)
    receivedGifts: Gift[]
}
