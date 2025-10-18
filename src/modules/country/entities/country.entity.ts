import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index, OneToMany } from 'typeorm'
import { User } from '../../user/entities/user.entity'
import { Room } from '../../room/entities/room.entity'

@Entity('countries')
export class Country extends CustomBaseEntity {
    @Column({ unique: true })
    @Index()
    name: string

    @Column({ unique: true, length: 3 })
    @Index()
    code: string // ISO 3166-1 alpha-3 country code (e.g., 'USA', 'GBR', 'IND')

    @Column({ nullable: true })
    flagUrl: string // URL to country flag image

    @Column({ nullable: true })
    emoji: string // Country flag emoji (e.g., 🇺🇸, 🇬🇧, 🇮🇳)

    @Column({ default: true })
    isActive: boolean

    @Column({ type: 'int', default: 0 })
    displayOrder: number // For sorting countries in dropdown

    @Column({ nullable: true })
    phoneCode: string // International dialing code (e.g., '+1', '+44', '+91')

    // Relations
    @OneToMany(() => User, (user) => user.country)
    users: User[]

    @OneToMany(() => Room, (room) => room.country)
    rooms: Room[]
}
