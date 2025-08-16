import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm'
import { User } from './user.entity'

@Entity('profile_visits')
@Unique(['visitorId', 'visitedUserId']) // Prevent duplicate visits from same user
@Index(['visitedUserId']) // Index for faster queries
export class ProfileVisit extends CustomBaseEntity {
    @Column('uuid')
    visitorId: string

    @Column('uuid')
    visitedUserId: string

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    lastVisitAt: Date

    // Relations
    @ManyToOne(() => User)
    @JoinColumn({ name: 'visitorId', referencedColumnName: 'uuid' })
    visitor: User

    @ManyToOne(() => User)
    @JoinColumn({ name: 'visitedUserId', referencedColumnName: 'uuid' })
    visitedUser: User
}
