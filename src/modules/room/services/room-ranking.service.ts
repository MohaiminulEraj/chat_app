import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between } from 'typeorm'
import { Cron, CronExpression } from '@nestjs/schedule'
import { RoomRanking, RankingPeriod } from '../entities/room-ranking.entity'
import { GiftTransaction } from '../../gift/entities/gift-transaction.entity'
import { User } from '../../user/entities/user.entity'
import { Room } from '../entities/room.entity'

@Injectable()
export class RoomRankingService {
    private readonly logger = new Logger(RoomRankingService.name)
    private onlineUsersCache = new Map<string, Set<string>>() // roomId -> Set<userId>
    private rankingCache = new Map<string, any>() // cacheKey -> {data, timestamp}
    private readonly CACHE_TTL = 60000 // 1 minute cache

    constructor(
        @InjectRepository(RoomRanking)
        private roomRankingRepository: Repository<RoomRanking>,
        @InjectRepository(GiftTransaction)
        private giftTransactionRepository: Repository<GiftTransaction>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Room)
        private roomRepository: Repository<Room>
    ) {}

    /**
     * Track user activity for online rankings
     */
    async trackUserActivity(roomId: string, userId: string): Promise<void> {
        if (!this.onlineUsersCache.has(roomId)) {
            this.onlineUsersCache.set(roomId, new Set())
        }
        this.onlineUsersCache.get(roomId)?.add(userId)
    }

    /**
     * Remove user from online tracking
     */
    async removeUserActivity(roomId: string, userId: string): Promise<void> {
        this.onlineUsersCache.get(roomId)?.delete(userId)
        if (this.onlineUsersCache.get(roomId)?.size === 0) {
            this.onlineUsersCache.delete(roomId)
        }
    }

    /**
     * Get hourly rankings for a room
     */
    async getHourlyRankings(roomId: string, limit?: number): Promise<any[]> {
        const cacheKey = `hourly_${roomId}`
        const cached = this.getCachedRanking(cacheKey)
        if (cached) {
            return limit ? cached.slice(0, limit) : cached
        }

        const oneHourAgo = new Date(Date.now() - 3600000)

        const rankings = await this.calculateRankings(
            roomId,
            RankingPeriod.HOURLY,
            oneHourAgo,
            new Date()
        )

        this.setCachedRanking(cacheKey, rankings)
        return limit ? rankings.slice(0, limit) : rankings
    }

    /**
     * Get weekly rankings for a room
     */
    async getWeeklyRankings(roomId: string, limit?: number): Promise<any[]> {
        const cacheKey = `weekly_${roomId}`
        const cached = this.getCachedRanking(cacheKey)
        if (cached) {
            return limit ? cached.slice(0, limit) : cached
        }

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600000)

        const rankings = await this.calculateRankings(
            roomId,
            RankingPeriod.WEEKLY,
            oneWeekAgo,
            new Date()
        )

        this.setCachedRanking(cacheKey, rankings)
        return limit ? rankings.slice(0, limit) : rankings
    }

    /**
     * Get total (all-time) rankings for a room
     */
    async getTotalRankings(roomId: string, limit?: number): Promise<any[]> {
        const cacheKey = `total_${roomId}`
        const cached = this.getCachedRanking(cacheKey)
        if (cached) {
            return limit ? cached.slice(0, limit) : cached
        }

        const room = await this.roomRepository.findOne({
            where: { uuid: roomId }
        })

        const rankings = await this.calculateRankings(
            roomId,
            RankingPeriod.TOTAL,
            room?.createdAt || new Date(0),
            new Date()
        )

        this.setCachedRanking(cacheKey, rankings)
        return limit ? rankings.slice(0, limit) : rankings
    }

    /**
     * Get online rankings (currently active users in room)
     */
    async getOnlineRankings(roomId: string, limit?: number): Promise<any[]> {
        const onlineUsers = this.onlineUsersCache.get(roomId)
        if (!onlineUsers || onlineUsers.size === 0) {
            return []
        }

        const userIds = Array.from(onlineUsers)

        // Get gift transactions for online users in last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 3600000)

        const rankings = await this.calculateRankings(
            roomId,
            RankingPeriod.ONLINE,
            oneDayAgo,
            new Date(),
            userIds
        )

        // CRITICAL: Include ALL online users even if they have no gift activity
        // Get user details for online users not in rankings
        const rankedUserIds = new Set(rankings.map((r) => r.userId))
        const unrankedUserIds = userIds.filter((id) => !rankedUserIds.has(id))

        if (unrankedUserIds.length > 0) {
            const unrankedUsers =
                await this.userRepository.findByIds(unrankedUserIds)

            const unrankedRankings = unrankedUsers.map((user) => ({
                userId: user.uuid,
                userName: user.name || user.displayName || 'Unknown',
                name: user.name || user.displayName || 'Unknown',
                userAvatar: user.avatarUrl || null,
                image: user.avatarUrl || null,
                country: user.country || '',
                diamond:
                    Math.round(
                        parseFloat(user.diamondBalance?.toString() || '0') * 100
                    ) / 100,
                diamondBalance:
                    Math.round(
                        parseFloat(user.diamondBalance?.toString() || '0') * 100
                    ) / 100,
                isEmailVerified: user.isEmailVerified || false,
                isVerified: user.isEmailVerified || false,
                level: user.level || 0,
                rank: 0, // Will be recalculated below
                giftsSent: {
                    value: 0,
                    count: 0,
                    topGift: null
                },
                giftsReceived: {
                    value: 0,
                    count: 0,
                    topGift: null
                },
                totalScore: 0,
                interactions: {
                    uniqueSenders: 0,
                    uniqueReceivers: 0
                },
                isOnline: true,
                period: RankingPeriod.ONLINE
            }))

            // Merge ranked and unranked users
            rankings.push(...unrankedRankings)

            // Re-sort and re-rank
            rankings.sort((a, b) => b.totalScore - a.totalScore)
            rankings.forEach((ranking, index) => {
                ranking.rank = index + 1
            })
        }

        return limit ? rankings.slice(0, limit) : rankings
    }

    /**
     * Core ranking calculation logic
     * Score = (Gifts Sent Value × 0.5) + (Gifts Received Value × 0.5)
     */
    private async calculateRankings(
        roomId: string,
        period: RankingPeriod,
        startDate: Date,
        endDate: Date,
        userIds?: string[]
    ): Promise<any[]> {
        const query = this.giftTransactionRepository
            .createQueryBuilder('gt')
            .leftJoinAndSelect('gt.gift', 'gift')
            .leftJoin('gt.sender', 'sender')
            .addSelect([
                'sender.uuid',
                'sender.name',
                'sender.displayName',
                'sender.avatarUrl',
                'sender.country',
                'sender.diamondBalance',
                'sender.isEmailVerified',
                'sender.level'
            ])
            .leftJoin('gt.receiver', 'receiver')
            .addSelect([
                'receiver.uuid',
                'receiver.name',
                'receiver.displayName',
                'receiver.avatarUrl',
                'receiver.country',
                'receiver.diamondBalance',
                'receiver.isEmailVerified',
                'receiver.level'
            ])
            .where('gt.roomId = :roomId', { roomId })
            .andWhere('gt.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate
            })
            .andWhere("gt.status = 'completed'")

        if (userIds && userIds.length > 0) {
            query.andWhere(
                '(gt.senderId IN (:...userIds) OR gt.receiverId IN (:...userIds))',
                { userIds }
            )
        }

        const transactions = await query.getMany()

        const userScores = new Map<
            string,
            {
                userId: string
                userName: string
                userAvatar: string
                country: string
                diamondBalance: number
                isEmailVerified: boolean
                level: number
                giftsSentValue: number
                giftsSentCount: number
                giftsReceivedValue: number
                giftsReceivedCount: number
                totalScore: number
                topGiftSent?: any
                topGiftReceived?: any
                uniqueSenders: Set<string>
                uniqueReceivers: Set<string>
                isOnline: boolean
            }
        >()

        for (const transaction of transactions) {
            const giftValue =
                parseFloat(transaction.amount?.toString() || '0') *
                transaction.quantity

            // Update sender stats
            if (!userScores.has(transaction.senderId)) {
                userScores.set(transaction.senderId, {
                    userId: transaction.senderId,
                    userName:
                        transaction.sender?.name ||
                        transaction.sender?.displayName ||
                        'Unknown',
                    userAvatar: transaction.sender?.avatarUrl || '',
                    country: transaction.sender?.country || '',
                    diamondBalance: parseFloat(
                        transaction.sender?.diamondBalance?.toString() || '0'
                    ),
                    isEmailVerified:
                        transaction.sender?.isEmailVerified || false,
                    level: transaction.sender?.level || 0,
                    giftsSentValue: 0,
                    giftsSentCount: 0,
                    giftsReceivedValue: 0,
                    giftsReceivedCount: 0,
                    totalScore: 0,
                    uniqueSenders: new Set(),
                    uniqueReceivers: new Set(),
                    isOnline:
                        this.onlineUsersCache
                            .get(roomId)
                            ?.has(transaction.senderId) || false
                })
            }

            const senderStats = userScores.get(transaction.senderId)!
            senderStats.giftsSentValue += giftValue
            senderStats.giftsSentCount += transaction.quantity
            senderStats.uniqueReceivers.add(transaction.receiverId)

            if (
                !senderStats.topGiftSent ||
                giftValue > senderStats.topGiftSent.value
            ) {
                senderStats.topGiftSent = {
                    giftId: transaction.gift?.uuid,
                    giftName: transaction.gift?.name,
                    value: giftValue
                }
            }

            // Update receiver stats
            if (!userScores.has(transaction.receiverId)) {
                userScores.set(transaction.receiverId, {
                    userId: transaction.receiverId,
                    userName:
                        transaction.receiver?.name ||
                        transaction.receiver?.displayName ||
                        'Unknown',
                    userAvatar: transaction.receiver?.avatarUrl || '',
                    country: transaction.receiver?.country || '',
                    diamondBalance: parseFloat(
                        transaction.receiver?.diamondBalance?.toString() || '0'
                    ),
                    isEmailVerified:
                        transaction.receiver?.isEmailVerified || false,
                    level: transaction.receiver?.level || 0,
                    giftsSentValue: 0,
                    giftsSentCount: 0,
                    giftsReceivedValue: 0,
                    giftsReceivedCount: 0,
                    totalScore: 0,
                    uniqueSenders: new Set(),
                    uniqueReceivers: new Set(),
                    isOnline:
                        this.onlineUsersCache
                            .get(roomId)
                            ?.has(transaction.receiverId) || false
                })
            }

            const receiverStats = userScores.get(transaction.receiverId)!
            receiverStats.giftsReceivedValue += giftValue
            receiverStats.giftsReceivedCount += transaction.quantity
            receiverStats.uniqueSenders.add(transaction.senderId)

            if (
                !receiverStats.topGiftReceived ||
                giftValue > receiverStats.topGiftReceived.value
            ) {
                receiverStats.topGiftReceived = {
                    giftId: transaction.gift?.uuid,
                    giftName: transaction.gift?.name,
                    value: giftValue
                }
            }
        }

        const rankings = Array.from(userScores.values()).map((stats) => {
            // Score Calculation: 50% sent + 50% received
            const sentScore = stats.giftsSentValue * 0.5
            const receivedScore = stats.giftsReceivedValue * 0.5
            stats.totalScore = sentScore + receivedScore

            return {
                userId: stats.userId,
                userName: stats.userName,
                name: stats.userName, // Alias for Flutter compatibility
                userAvatar: stats.userAvatar,
                image: stats.userAvatar, // Alias for Flutter compatibility
                country: stats.country,
                diamond: Math.round(stats.diamondBalance * 100) / 100,
                diamondBalance: Math.round(stats.diamondBalance * 100) / 100,
                isEmailVerified: stats.isEmailVerified,
                isVerified: stats.isEmailVerified, // Alias for Flutter compatibility
                level: stats.level,
                rank: 0, // Will be set after sorting
                giftsSent: {
                    value: Math.round(stats.giftsSentValue * 100) / 100,
                    count: stats.giftsSentCount,
                    topGift: stats.topGiftSent
                },
                giftsReceived: {
                    value: Math.round(stats.giftsReceivedValue * 100) / 100,
                    count: stats.giftsReceivedCount,
                    topGift: stats.topGiftReceived
                },
                totalScore: Math.round(stats.totalScore * 100) / 100,
                interactions: {
                    uniqueSenders: stats.uniqueSenders.size,
                    uniqueReceivers: stats.uniqueReceivers.size
                },
                isOnline: stats.isOnline,
                period
            }
        })

        rankings.sort((a, b) => b.totalScore - a.totalScore)

        rankings.forEach((ranking, index) => {
            ranking.rank = index + 1
        })

        if (period !== RankingPeriod.ONLINE) {
            await this.persistRankings(roomId, period, rankings)
        }

        return rankings
    }

    /**
     * Persist rankings to database
     */
    private async persistRankings(
        roomId: string,
        period: RankingPeriod,
        rankings: any[]
    ): Promise<void> {
        const isRoomExists = await this.roomRepository.findOne({
            where: { uuid: roomId }
        })

        if (!isRoomExists) {
            this.logger.warn(
                `Room with ID ${roomId} does not exist. Skipping ranking persistence.`
            )
            throw new HttpException('Room not found', HttpStatus.NOT_FOUND)
        }

        try {
            // Delete existing rankings using query builder to handle UUID properly
            await this.roomRankingRepository
                .createQueryBuilder()
                .delete()
                .from(RoomRanking)
                .where('roomId = :roomId', { roomId })
                .andWhere('period = :period', { period })
                .execute()

            const rankingEntities = rankings.map((ranking) =>
                this.roomRankingRepository.create({
                    roomId,
                    userId: ranking.userId,
                    period,
                    giftsSentValue: ranking.giftsSent.value,
                    giftsSentCount: ranking.giftsSent.count,
                    giftsReceivedValue: ranking.giftsReceived.value,
                    giftsReceivedCount: ranking.giftsReceived.count,
                    totalScore: ranking.totalScore,
                    rank: ranking.rank,
                    lastActivityAt: new Date(),
                    metadata: {
                        topGiftSent: ranking.giftsSent.topGift,
                        topGiftReceived: ranking.giftsReceived.topGift,
                        uniqueSenders: ranking.interactions.uniqueSenders,
                        uniqueReceivers: ranking.interactions.uniqueReceivers,
                        isOnline: ranking.isOnline
                    }
                })
            )

            await this.roomRankingRepository.save(rankingEntities)

            this.logger.log(
                `✅ Successfully persisted ${rankingEntities.length} ${period} rankings for room ${roomId}`
            )
        } catch (error) {
            this.logger.error(
                `Failed to persist rankings for room ${roomId}: ${error.message}`
            )
        }
    }

    /**
     * Get cached ranking
     */
    private getCachedRanking(key: string): any[] | null {
        const cached = this.rankingCache.get(key)
        if (!cached) return null

        if (Date.now() - cached.timestamp > this.CACHE_TTL) {
            this.rankingCache.delete(key)
            return null
        }

        return cached.data
    }

    /**
     * Set cached ranking
     */
    private setCachedRanking(key: string, data: any[]): void {
        this.rankingCache.set(key, {
            data,
            timestamp: Date.now()
        })
    }

    /**
     * Clear cache for a room
     */
    async clearRoomCache(roomId: string): Promise<void> {
        const keysToDelete = []
        for (const key of this.rankingCache.keys()) {
            if (key.includes(roomId)) {
                keysToDelete.push(key)
            }
        }
        keysToDelete.forEach((key) => this.rankingCache.delete(key))
    }

    /**
     * Update rankings after gift transaction
     */
    async updateRankingsAfterGift(roomId: string): Promise<void> {
        await this.clearRoomCache(roomId)
        this.logger.log(`📊 Rankings cache cleared for room ${roomId}`)
    }

    /**
     * Get top ranked users across all periods
     */
    async getTopRankedUsers(roomId: string, limit: number = 10): Promise<any> {
        const [hourly, weekly, total, online] = await Promise.all([
            this.getHourlyRankings(roomId, limit),
            this.getWeeklyRankings(roomId, limit),
            this.getTotalRankings(roomId, limit),
            this.getOnlineRankings(roomId, limit)
        ])

        return {
            hourly,
            weekly,
            total,
            online,
            updatedAt: new Date().toISOString()
        }
    }

    /**
     * Scheduled task to update hourly rankings
     */
    @Cron(CronExpression.EVERY_HOUR)
    async updateHourlyRankings(): Promise<void> {
        this.logger.log('⏰ Updating hourly rankings...')

        try {
            const rooms = await this.roomRepository.find({
                where: { isActive: true }
            })

            for (const room of rooms) {
                await this.clearRoomCache(room.uuid)
            }

            this.logger.log(
                `✅ Hourly rankings cache cleared for ${rooms.length} active rooms`
            )
        } catch (error) {
            this.logger.error(
                `Failed to update hourly rankings: ${error.message}`
            )
        }
    }
}
