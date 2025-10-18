import { Injectable, Logger } from '@nestjs/common'
import { TaskService } from '../task/task.service'

/**
 * Helper service to automatically track task progress based on user actions
 */
@Injectable()
export class TaskProgressTracker {
    private readonly logger = new Logger(TaskProgressTracker.name)

    constructor(private readonly taskService: TaskService) {}

    /**
     * Track video call join
     */
    async trackVideoCallJoin(userId: string): Promise<void> {
        try {
            await this.taskService.updateUserTaskProgress(
                userId,
                'join_video_calls',
                1
            )
            this.logger.log(`✅ Video call progress tracked for user ${userId}`)
        } catch (error) {
            this.logger.warn(
                `Failed to track video call progress: ${error.message}`
            )
        }
    }

    /**
     * Track message send
     */
    async trackMessageSend(userId: string, roomId?: string): Promise<void> {
        try {
            await this.taskService.updateUserTaskProgress(
                userId,
                'send_messages',
                1
            )

            if (roomId) {
                await this.taskService.updateRoomTaskProgress(
                    roomId,
                    userId,
                    'room_comments',
                    1
                )
            }

            this.logger.log(`✅ Message progress tracked for user ${userId}`)
        } catch (error) {
            this.logger.warn(
                `Failed to track message progress: ${error.message}`
            )
        }
    }

    /**
     * Track gift send
     */
    async trackGiftSend(
        userId: string,
        giftCount: number = 1,
        roomId?: string
    ): Promise<void> {
        try {
            await this.taskService.updateUserTaskProgress(
                userId,
                'send_gifts',
                giftCount
            )

            if (roomId) {
                await this.taskService.updateRoomTaskProgress(
                    roomId,
                    userId,
                    'room_gifts_vip',
                    giftCount
                )
            }

            this.logger.log(
                `✅ Gift progress tracked for user ${userId} (${giftCount} gifts)`
            )
        } catch (error) {
            this.logger.warn(`Failed to track gift progress: ${error.message}`)
        }
    }

    /**
     * Track daily bonus collection
     */
    async trackDailyBonus(userId: string): Promise<void> {
        try {
            await this.taskService.updateUserTaskProgress(
                userId,
                'collect_bonus',
                1
            )
            this.logger.log(
                `✅ Daily bonus progress tracked for user ${userId}`
            )
        } catch (error) {
            this.logger.warn(
                `Failed to track daily bonus progress: ${error.message}`
            )
        }
    }

    /**
     * Track friend invitation
     */
    async trackFriendInvite(userId: string): Promise<void> {
        try {
            await this.taskService.updateUserTaskProgress(
                userId,
                'invite_friends',
                1
            )
            this.logger.log(
                `✅ Friend invite progress tracked for user ${userId}`
            )
        } catch (error) {
            this.logger.warn(
                `Failed to track friend invite progress: ${error.message}`
            )
        }
    }

    /**
     * Track room seat time (in minutes)
     */
    async trackRoomSeatTime(
        roomId: string,
        userId: string,
        minutes: number = 1
    ): Promise<void> {
        try {
            await this.taskService.updateRoomTaskProgress(
                roomId,
                userId,
                'room_seat_time',
                minutes
            )
            this.logger.log(
                `✅ Room seat time tracked for user ${userId} (${minutes} minutes)`
            )
        } catch (error) {
            this.logger.warn(`Failed to track room seat time: ${error.message}`)
        }
    }

    /**
     * Track PK battle win
     */
    async trackPKBattleWin(userId: string, roomId?: string): Promise<void> {
        try {
            await this.taskService.updateUserTaskProgress(
                userId,
                'win_pk_battles',
                1
            )
            this.logger.log(`✅ PK battle win tracked for user ${userId}`)
        } catch (error) {
            this.logger.warn(`Failed to track PK battle win: ${error.message}`)
        }
    }

    /**
     * Track room ranking achievement
     */
    async trackRoomRanking(
        roomId: string,
        userId: string,
        rank: number
    ): Promise<void> {
        try {
            if (rank <= 10) {
                await this.taskService.updateRoomTaskProgress(
                    roomId,
                    userId,
                    'room_top_10',
                    1
                )
                this.logger.log(
                    `✅ Room ranking achievement tracked for user ${userId} (rank ${rank})`
                )
            }
        } catch (error) {
            this.logger.warn(`Failed to track room ranking: ${error.message}`)
        }
    }

    /**
     * Generic method to track any task by taskId
     */
    async trackCustomTask(
        taskId: string,
        userId: string,
        increment: number = 1,
        roomId?: string
    ): Promise<void> {
        try {
            if (roomId) {
                await this.taskService.updateRoomTaskProgress(
                    roomId,
                    userId,
                    taskId,
                    increment
                )
            } else {
                await this.taskService.updateUserTaskProgress(
                    userId,
                    taskId,
                    increment
                )
            }
            this.logger.log(
                `✅ Custom task ${taskId} tracked for user ${userId}`
            )
        } catch (error) {
            this.logger.warn(`Failed to track custom task: ${error.message}`)
        }
    }
}
