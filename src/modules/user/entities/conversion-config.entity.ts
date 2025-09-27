import { CustomBaseEntity } from 'src/common/entity/custom-base.entity'
import { Column, Entity, Index } from 'typeorm'

export enum ConversionType {
    DIAMOND_TO_BINS = 'diamond_to_bins',
    BINS_TO_DIAMOND = 'bins_to_diamond',
    BINS_TO_USD = 'bins_to_usd'
}

@Entity('conversion_config')
@Index(['conversionType'], { unique: true })
export class ConversionConfig extends CustomBaseEntity {
    @Column({
        type: 'enum',
        enum: ConversionType,
        unique: true
    })
    conversionType: ConversionType

    @Column({ type: 'decimal', precision: 15, scale: 4, default: 1 })
    sourceValue: number // e.g., 1 diamond or 1 USD

    @Column({ type: 'decimal', precision: 15, scale: 4, default: 1 })
    targetValue: number // e.g., 2 bins or 210 bins

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    adminCommissionPercent: number // Commission percentage for conversions

    @Column({ default: true })
    isActive: boolean

    @Column({ type: 'jsonb', nullable: true })
    metadata: any

    @Column({ nullable: true })
    lastUpdatedBy: string // Admin who last updated this config

    @Column({ type: 'timestamp', nullable: true })
    lastUpdatedAt: Date
}
