import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DailyTask } from './entities/daily-task.entity'
import { UserTaskProgress } from './entities/user-task-progress.entity'
import { RoomTaskProgress } from './entities/room-task-progress.entity'
import { TaskService } from './task.service'
import { TaskProgressTracker } from './task-progress-tracker.service'

@Module({
    imports: [
        TypeOrmModule.forFeature([
            DailyTask,
            UserTaskProgress,
            RoomTaskProgress
        ])
    ],
    providers: [TaskService, TaskProgressTracker],
    exports: [TaskService, TaskProgressTracker]
})
export class TaskModule {}
