import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { User } from 'src/modules/user/entities/user.entity'
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm'

@Entity({ name: 'login_logs' })
export class LoginLog extends CustomBaseEntity {
    @Column('uuid')
    userId: string

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    time: Date

    @Column({ nullable: true })
    ip: string

    @ManyToOne(() => User, (user) => user.loginLogs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
    user: User
}
