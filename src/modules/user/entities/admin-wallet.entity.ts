import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity } from 'typeorm'

@Entity('admin_wallet')
export class AdminWallet extends CustomBaseEntity {
    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    binsBalance: number // Bins collected from commissions

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    diamondBalance: number // Diamonds collected from commissions

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    usdBalance: number // USD equivalent value

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalCommissionsEarned: number // Total commissions earned in bins

    @Column({ type: 'jsonb', nullable: true })
    statistics: {
        totalConversions?: number
        totalWithdrawals?: number
        averageCommissionPercent?: number
        lastUpdated?: Date
    }
}
