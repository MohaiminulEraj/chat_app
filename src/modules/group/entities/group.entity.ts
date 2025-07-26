import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { Room } from '../../room/entities/room.entity'
import { User } from '../../user/entities/user.entity'
import { GroupMember } from './group-member.entity'
import { GroupRole } from './group-role.entity'
import { GroupSettings } from './group-settings.entity'

@Entity('groups')
export class Group extends CustomBaseEntity {
    @Column()
    name: string

    @Column({ nullable: true })
    description: string

    @Column({ nullable: true })
    tag: string

    @Column({ nullable: true })
    avatarUrl: string

    @Column({ default: false })
    isPublic: boolean

    @Column({ nullable: true })
    inviteCode: string

    @Column({ type: 'uuid' })
    ownerId: string

    @Column({ nullable: true })
    location: string

    @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
    latitude: number

    @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
    longitude: number

    @Column({ nullable: true })
    flagUrl: string

    // Add columns to track user engagement for calculations
    @Column({ default: 0 })
    totalVisits: number // Track how many times users visit this group

    @Column({ default: 0 })
    activeUsersCount: number // Current active users

    @Column({ default: 0 })
    giftTransactionCount: number // Total gift transactions in this group

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalGiftValue: number // Total value of gifts exchanged

    @Column({ type: 'timestamp', nullable: true })
    lastActiveAt: Date // When group was last active

    // Relations
    @ManyToOne(() => User)
    @JoinColumn({ name: 'ownerId', referencedColumnName: 'uuid' })
    owner: User

    @OneToMany(() => GroupMember, (member) => member.group)
    members: GroupMember[]

    @OneToMany(() => GroupRole, (role) => role.group)
    roles: GroupRole[]

    @OneToMany(() => GroupSettings, (settings) => settings.group)
    settings: GroupSettings[]

    @OneToMany(() => Room, (room) => room.group)
    rooms: Room[]
}
