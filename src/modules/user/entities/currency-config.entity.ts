import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index } from 'typeorm'

export enum CurrencyType {
    BINS = 'bins',
    DIAMOND = 'diamond'
}

@Entity('currency_config')
@Index(['currencyType'], { unique: true })
export class CurrencyConfig extends CustomBaseEntity {
    @Column({
        type: 'enum',
        enum: CurrencyType,
        unique: true
    })
    currencyType: CurrencyType

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 1 })
    exchangeRateToUSD: number // How much 1 unit of this currency equals in USD

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 1 })
    binsToDiamondRate: number // For DIAMOND type: how many bins = 1 diamond

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0.01 })
    minimumPurchaseAmount: number

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 10000 })
    maximumPurchaseAmount: number

    @Column({ default: true })
    isActive: boolean

    @Column({ nullable: true })
    description: string

    @Column({ nullable: true })
    iconUrl: string

    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        displayName?: string
        symbol?: string
        decimalPlaces?: number
        isTransferable?: boolean
        canBeEarned?: boolean
        canBePurchased?: boolean
    }

    @Column({ type: 'timestamp', nullable: true })
    lastUpdatedAt: Date

    @Column({ type: 'uuid', nullable: true })
    updatedBy: string // Admin user who last updated this config
}
