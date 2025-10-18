import {
    IsString,
    IsInt,
    IsEnum,
    IsOptional,
    IsBoolean,
    IsHexColor,
    IsUUID,
    Min,
    Max
} from 'class-validator'
import { TaskType, TaskCategory } from '../entities/daily-task.entity'

export class CreateTaskDto {
    @IsString()
    taskId: string

    @IsString()
    icon: string

    @IsString()
    title: string

    @IsOptional()
    @IsString()
    description?: string

    @IsInt()
    @Min(1)
    total: number

    @IsInt()
    @Min(0)
    reward: number

    @IsOptional()
    @IsHexColor()
    color?: string

    @IsEnum(TaskType)
    taskType: TaskType

    @IsEnum(TaskCategory)
    category: TaskCategory

    @IsOptional()
    @IsUUID()
    roomId?: string

    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number

    @IsOptional()
    metadata?: {
        rewardType?: 'bins' | 'diamonds'
        requiredLevel?: number
        expiresAt?: Date
        repeatDaily?: boolean
        requirements?: any
    }
}

export class UpdateTaskDto {
    @IsOptional()
    @IsString()
    icon?: string

    @IsOptional()
    @IsString()
    title?: string

    @IsOptional()
    @IsString()
    description?: string

    @IsOptional()
    @IsInt()
    @Min(1)
    total?: number

    @IsOptional()
    @IsInt()
    @Min(0)
    reward?: number

    @IsOptional()
    @IsHexColor()
    color?: string

    @IsOptional()
    @IsBoolean()
    isActive?: boolean

    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number

    @IsOptional()
    metadata?: {
        rewardType?: 'bins' | 'diamonds'
        requiredLevel?: number
        expiresAt?: Date
        repeatDaily?: boolean
        requirements?: any
    }
}

export class TaskProgressDto {
    @IsUUID()
    userId: string

    @IsUUID()
    taskId: string

    @IsInt()
    @Min(0)
    progress: number

    @IsOptional()
    @IsUUID()
    roomId?: string
}

export class ClaimRewardDto {
    @IsUUID()
    taskId: string

    @IsOptional()
    @IsUUID()
    roomId?: string
}
