import {
    BaseEntity,
    BeforeInsert,
    Column,
    CreateDateColumn,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm'
import { v4 as uuidv4 } from 'uuid'

export class CustomBaseEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment')
    id: number

    @Index({ unique: true })
    @Column('uuid')
    uuid: string

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @BeforeInsert()
    generateUuid() {
        if (!this.uuid) {
            this.uuid = uuidv4()
        }
    }
}
