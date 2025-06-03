import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'
import { Group } from './group.entity'

@Entity('group_settings')
export class GroupSettings extends CustomBaseEntity {
    @Column({ type: 'uuid' })
    groupId: string

    @Column({ default: true })
    allowTextMessages: boolean

    @Column({ default: true })
    allowVoiceMessages: boolean

    @Column({ default: true })
    allowImageMessages: boolean

    @Column({ default: true })
    allowVideoMessages: boolean

    @Column({ default: true })
    allowFileSharing: boolean

    @Column({ default: true })
    allowGifts: boolean

    // Relations
    @ManyToOne(() => Group)
    @JoinColumn({ name: 'groupId', referencedColumnName: 'uuid' })
    group: Group
}
