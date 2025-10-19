import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DailyTask, TaskType, TaskCategory } from './entities/daily-task.entity'
import { UserTaskProgress } from './entities/user-task-progress.entity'
import { RoomTaskProgress } from './entities/room-task-progress.entity'
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto'

@Injectable()
export class TaskService {
    private readonly logger = new Logger(TaskService.name)

    constructor(
        @InjectRepository(DailyTask)
        private dailyTaskRepository: Repository<DailyTask>,
        @InjectRepository(UserTaskProgress)
        private userTaskProgressRepository: Repository<UserTaskProgress>,
        @InjectRepository(RoomTaskProgress)
        private roomTaskProgressRepository: Repository<RoomTaskProgress>
    ) {}

    /**
     * Get user daily tasks with progress
     */
    async getUserDailyTasks(userId: string): Promise<any[]> {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get all active user tasks (global and user-specific)
        const tasks = await this.dailyTaskRepository.find({
            where: [
                {
                    category: TaskCategory.USER_TAB,
                    taskType: TaskType.USER,
                    isActive: true
                },
                {
                    category: TaskCategory.USER_TAB,
                    taskType: TaskType.GLOBAL,
                    isActive: true
                }
            ],
            order: { sortOrder: 'ASC', createdAt: 'DESC' }
        })

        // Get user's progress for today
        const progressRecords = await this.userTaskProgressRepository.find({
            where: {
                userId,
                date: today as any
            }
        })

        // Map progress to tasks
        const progressMap = new Map(progressRecords.map((p) => [p.taskId, p]))

        return tasks.map((task) => {
            const progress = progressMap.get(task.uuid)
            return {
                id: task.taskId,
                icon: task.icon,
                title: task.title,
                description: task.description,
                progress: progress?.progress || 0,
                total: task.total,
                reward: task.reward,
                color: task.color,
                isCompleted: progress?.isCompleted || false,
                rewardClaimed: progress?.rewardClaimed || false,
                metadata: task.metadata
            }
        })
    }

    /**
     * Get room daily tasks with progress
     */
    async getRoomDailyTasks(roomId: string, userId: string): Promise<any[]> {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get room-specific tasks and global room tasks
        const tasks = await this.dailyTaskRepository.find({
            where: [
                { category: TaskCategory.ROOM_TAB, roomId, isActive: true },
                {
                    category: TaskCategory.ROOM_TAB,
                    taskType: TaskType.ROOM,
                    roomId: null,
                    isActive: true
                }
            ],
            order: { sortOrder: 'ASC', createdAt: 'DESC' }
        })

        // Get user's progress for this room today
        const progressRecords = await this.roomTaskProgressRepository.find({
            where: {
                roomId,
                userId,
                date: today as any
            }
        })

        // Map progress to tasks
        const progressMap = new Map(progressRecords.map((p) => [p.taskId, p]))

        return tasks.map((task) => {
            const progress = progressMap.get(task.uuid)
            return {
                id: task.taskId,
                icon: task.icon,
                title: task.title,
                description: task.description,
                progress: progress?.progress || 0,
                total: task.total,
                reward: task.reward,
                color: task.color,
                isCompleted: progress?.isCompleted || false,
                rewardClaimed: progress?.rewardClaimed || false,
                metadata: task.metadata
            }
        })
    }

    /**
     * Create a new daily task (Admin)
     */
    async createTask(
        createTaskDto: CreateTaskDto,
        adminId: string
    ): Promise<DailyTask> {
        // Check if task with same taskId already exists
        const existing = await this.dailyTaskRepository.findOne({
            where: { taskId: createTaskDto.taskId }
        })

        if (existing) {
            throw new BadRequestException(
                `Task with ID '${createTaskDto.taskId}' already exists`
            )
        }

        const task = this.dailyTaskRepository.create({
            ...createTaskDto,
            createdBy: adminId,
            color: createTaskDto.color || '#1976D2'
        })

        const saved = await this.dailyTaskRepository.save(task)

        this.logger.log(`✅ Task created: ${task.taskId} by admin ${adminId}`)

        return saved
    }

    /**
     * Update existing task (Admin)
     */
    async updateTask(
        taskId: string,
        updateTaskDto: UpdateTaskDto
    ): Promise<DailyTask> {
        const task = await this.dailyTaskRepository.findOne({
            where: { uuid: taskId }
        })

        if (!task) {
            throw new NotFoundException('Task not found')
        }

        Object.assign(task, updateTaskDto)
        const updated = await this.dailyTaskRepository.save(task)

        this.logger.log(`✅ Task updated: ${task.taskId}`)

        return updated
    }

    /**
     * Delete task (Admin)
     */
    async deleteTask(taskId: string): Promise<void> {
        const task = await this.dailyTaskRepository.findOne({
            where: { uuid: taskId }
        })

        if (!task) {
            throw new NotFoundException('Task not found')
        }

        await this.dailyTaskRepository.remove(task)

        this.logger.log(`✅ Task deleted: ${task.taskId}`)
    }

    /**
     * Get all tasks (Admin)
     */
    async getAllTasks(
        category?: TaskCategory,
        roomId?: string
    ): Promise<DailyTask[]> {
        const where: any = {}

        if (category) {
            where.category = category
        }

        if (roomId) {
            where.roomId = roomId
        }

        return this.dailyTaskRepository.find({
            where,
            order: { sortOrder: 'ASC', createdAt: 'DESC' }
        })
    }

    /**
     * Update user task progress
     */
    async updateUserTaskProgress(
        userId: string,
        taskId: string,
        increment: number = 1
    ): Promise<UserTaskProgress> {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Find task
        const task = await this.dailyTaskRepository.findOne({
            where: { taskId }
        })

        if (!task) {
            throw new NotFoundException('Task not found')
        }

        // Find or create progress record
        let progress = await this.userTaskProgressRepository.findOne({
            where: {
                userId,
                taskId: task.uuid,
                date: today as any
            }
        })

        if (!progress) {
            progress = this.userTaskProgressRepository.create({
                userId,
                taskId: task.uuid,
                progress: 0,
                date: today as any
            })
        }

        // Update progress
        progress.progress = Math.min(progress.progress + increment, task.total)

        // Check if completed
        if (progress.progress >= task.total && !progress.isCompleted) {
            progress.isCompleted = true
            progress.completedAt = new Date()
        }

        progress.metadata = {
            ...progress.metadata,
            lastActionAt: new Date()
        }

        return this.userTaskProgressRepository.save(progress)
    }

    /**
     * Update room task progress
     */
    async updateRoomTaskProgress(
        roomId: string,
        userId: string,
        taskId: string,
        increment: number = 1
    ): Promise<RoomTaskProgress> {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Find task
        const task = await this.dailyTaskRepository.findOne({
            where: { taskId }
        })

        if (!task) {
            throw new NotFoundException('Task not found')
        }

        // Find or create progress record
        let progress = await this.roomTaskProgressRepository.findOne({
            where: {
                roomId,
                userId,
                taskId: task.uuid,
                date: today as any
            }
        })

        if (!progress) {
            progress = this.roomTaskProgressRepository.create({
                roomId,
                userId,
                taskId: task.uuid,
                progress: 0,
                date: today as any
            })
        }

        // Update progress
        progress.progress = Math.min(progress.progress + increment, task.total)

        // Check if completed
        if (progress.progress >= task.total && !progress.isCompleted) {
            progress.isCompleted = true
            progress.completedAt = new Date()
        }

        progress.metadata = {
            ...progress.metadata,
            lastActionAt: new Date()
        }

        return this.roomTaskProgressRepository.save(progress)
    }

    /**
     * Claim task reward
     */
    async claimReward(
        userId: string,
        taskId: string,
        roomId?: string
    ): Promise<{
        success: boolean
        reward: number
        rewardType: 'bins' | 'diamonds'
    }> {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Find task
        const task = await this.dailyTaskRepository.findOne({
            where: { uuid: taskId }
        })

        if (!task) {
            throw new NotFoundException('Task not found')
        }

        // Find progress
        let progress: UserTaskProgress | RoomTaskProgress | null

        if (roomId) {
            progress = await this.roomTaskProgressRepository.findOne({
                where: {
                    roomId,
                    userId,
                    taskId,
                    date: today as any
                }
            })
        } else {
            progress = await this.userTaskProgressRepository.findOne({
                where: {
                    userId,
                    taskId,
                    date: today as any
                }
            })
        }

        if (!progress) {
            throw new NotFoundException('Task progress not found')
        }

        if (!progress.isCompleted) {
            throw new BadRequestException('Task not completed yet')
        }

        if (progress.rewardClaimed) {
            throw new BadRequestException('Reward already claimed')
        }

        // Mark as claimed
        progress.rewardClaimed = true
        progress.rewardClaimedAt = new Date()

        if (roomId) {
            await this.roomTaskProgressRepository.save(
                progress as RoomTaskProgress
            )
        } else {
            await this.userTaskProgressRepository.save(
                progress as UserTaskProgress
            )
        }

        const rewardType = task.metadata?.rewardType || 'bins'

        this.logger.log(
            `💰 Reward claimed: ${task.reward} ${rewardType} for task ${task.taskId} by user ${userId}`
        )

        return {
            success: true,
            reward: task.reward,
            rewardType
        }
    }
}
