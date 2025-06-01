import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm'
import { Room } from '../../room/entities/room.entity' // Add this import
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
    avatarUrl: string

    @Column({ default: false })
    isPublic: boolean

    @Column({ nullable: true })
    inviteCode: string

    @Column({ type: 'uuid' })
    ownerId: string

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
