import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { User } from '../../user/entities/user.entity'

export enum FriendshipStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    BLOCKED = 'blocked'
}

@Entity('friendships')
export class Friendship extends CustomBaseEntity {
    @Column('uuid')
    userId: string

    @Column('uuid')
    friendId: string

    @Column({
        type: 'enum',
        enum: FriendshipStatus,
        default: FriendshipStatus.PENDING
    })
    status: FriendshipStatus

    @Column({ nullable: true })
    blockedBy: string

    // Relations
    @ManyToOne(() => User, (user) => user.friendships)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User

    @ManyToOne(() => User)
    @JoinColumn({ name: 'friendId', referencedColumnName: 'uuid' })
    friend: User
}
