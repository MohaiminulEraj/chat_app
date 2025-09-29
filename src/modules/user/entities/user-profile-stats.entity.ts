import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm'
import { User } from './user.entity'

@Entity('user_profile_stats')
export class UserProfileStats extends CustomBaseEntity {
    @Column('uuid', { unique: true })
    @Index()
    userId: string

    @Column({ type: 'int', default: 0 })
    totalRoomsJoined: number

    @Column({ type: 'int', default: 0 })
    totalTimeInRoomsHours: number

    @Column({ nullable: true })
    favoriteRoomType: string

    @Column({ type: 'int', default: 0 })
    hostingExperienceMonths: number

    @Column({ type: 'decimal', precision: 2, scale: 1, default: 0 })
    communityRating: number

    @Column({ type: 'int', default: 0 })
    totalGiftsReceived: number

    @Column({ type: 'int', default: 0 })
    totalGiftsSent: number

    @Column({ type: 'jsonb', nullable: true })
    achievements: string[]

    @Column({ type: 'int', default: 0 })
    followersCount: number

    @Column({ nullable: true })
    location: string

    @Column({ type: 'text', nullable: true })
    bio: string

    // Relations
    @OneToOne(() => User)
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User
}
