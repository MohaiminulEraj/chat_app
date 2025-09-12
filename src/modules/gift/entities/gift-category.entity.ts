import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index } from 'typeorm'

@Entity('gift_categories')
@Index(['categoryId'], { unique: true })
export class GiftCategory extends CustomBaseEntity {
    @Column({ unique: true })
    categoryId: string

    @Column()
    name: string

    @Column({ nullable: true })
    description: string

    @Column({ nullable: true })
    iconUrl: string

    @Column({ default: true })
    isActive: boolean

    @Column({ type: 'int', default: 0 })
    sortOrder: number
}
