import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { Group } from './group.entity'

@Entity('group_roles')
export class GroupRole extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    groupId: string

    @Column()
    name: string

    @Column({ default: 0 })
    priority: number

    @Column({ type: 'jsonb' })
    permissions: {
        manageGroup: boolean
        manageRoles: boolean
        manageMembers: boolean
        manageRooms: boolean
        sendMessages: boolean
        deleteMessages: boolean
        mentionEveryone: boolean
        createInvites: boolean
        kickMembers: boolean
        banMembers: boolean
    }

    @Column({ nullable: true })
    color: string

    // Relations
    @ManyToOne(() => Group)
    @JoinColumn({ name: 'groupId', referencedColumnName: 'uuid' })
    group: Group
}
