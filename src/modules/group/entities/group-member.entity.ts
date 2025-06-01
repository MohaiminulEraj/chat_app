import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    Unique
} from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { GroupRole } from './group-role.entity'
import { Group } from './group.entity'

@Entity('group_members')
@Unique(['userId', 'groupId'])
@Index(['groupId', 'userId'])
export class GroupMember extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    userId: string

    @Column({ type: 'uuid' })
    groupId: string

    @Column({ type: 'uuid' })
    roleId: string

    @Column({ default: false })
    isMuted: boolean

    @Column({ type: 'timestamp', nullable: true })
    mutedUntil: Date

    @CreateDateColumn()
    joinedAt: Date

    // Relations
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User

    @ManyToOne(() => Group)
    @JoinColumn({ name: 'groupId', referencedColumnName: 'uuid' })
    group: Group

    @ManyToOne(() => GroupRole) 
    @JoinColumn({ name: 'roleId', referencedColumnName: 'uuid' })
    role: GroupRole
}
