import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { Group } from '../../group/entities/group.entity'
import { User } from '../../user/entities/user.entity'
import { RoomParticipant } from './room-participant.entity'
import { RoomRoleAssignment } from './room-role.entity'
import { RoomWaitingList } from './room-waiting-list.entity'

export enum RoomType {
    PUBLIC = 'public',
    PRIVATE = 'private',
    GROUP = 'group',
    VOICE = 'voice' // Add VOICE type
}

@Entity('rooms')
export class Room extends CustomBaseEntity {
    @Column()
    name: string

    @Column({ nullable: true })
    description?: string

    @Column({
        type: 'enum',
        enum: RoomType,
        default: RoomType.PUBLIC
    })
    type: RoomType

    @Column({ type: 'uuid', nullable: true })
    groupId?: string // For group rooms

    @Column({ type: 'uuid' })
    ownerId: string

    @Column({ default: 100 }) // Max participants
    capacity: number

    @Column({ default: 8 }) // Add maxSeats property
    maxSeats: number

    @Column({ default: false })
    isLocked: boolean

    @Column({ nullable: true })
    password?: string

    @Column({ default: true }) // Add isActive property
    isActive: boolean

    // Relations
    @ManyToOne(() => User)
    @JoinColumn({ name: 'ownerId', referencedColumnName: 'uuid' })
    owner: User

    @ManyToOne(() => Group, (group) => group.rooms, { nullable: true })
    @JoinColumn({ name: 'groupId', referencedColumnName: 'uuid' })
    group?: Group

    @OneToMany(() => RoomParticipant, (participant) => participant.room)
    participants: RoomParticipant[]

    @OneToMany(() => RoomWaitingList, (waiting) => waiting.room)
    waitingList: RoomWaitingList[]

    @OneToMany(
        () => RoomRoleAssignment,
        (roleAssignment) => roleAssignment.room
    )
    roleAssignments: RoomRoleAssignment[]
}
