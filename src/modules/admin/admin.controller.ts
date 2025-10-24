import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    Request,
    UseGuards,
    HttpStatus,
    BadRequestException
} from '@nestjs/common'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
    ApiBearerAuth,
    ApiQuery,
    ApiParam
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AdminGuard } from '../../common/guards/admin.guard'
import { AdminOnly } from '../../common/decorators/roles.decorator'
import { AdminService } from './admin.service'
import {
    CurrencyType,
    AdminTransactionType
} from '../user/entities/admin-transaction.entity'
import { ConversionType } from '../user/entities/conversion-config.entity'
import { TaskService } from '../task/task.service'
import {
    CreateTaskDto,
    UpdateTaskDto,
    ClaimRewardDto
} from '../task/dto/task.dto'
import { TaskCategory } from '../task/entities/daily-task.entity'

@ApiTags('🔐 Admin Management')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@AdminOnly()
@ApiBearerAuth()
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly taskService: TaskService
    ) { }

    @Post('gift-currency')
    @ApiOperation({
        summary: 'Gift currency to user (Admin Only)',
        description: 'Admin can gift bins or diamonds to any user with tracking'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                affectedUserId: {
                    type: 'string',
                    example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
                    description: 'Target user UUID'
                },
                currencyType: {
                    type: 'string',
                    enum: ['bins', 'diamonds'],
                    example: 'diamonds'
                },
                amount: {
                    type: 'number',
                    example: 100,
                    description: 'Amount to gift'
                },
                reason: {
                    type: 'string',
                    example: 'Welcome bonus',
                    description: 'Reason for the gift'
                },
                notes: {
                    type: 'string',
                    example: 'New user promotion',
                    description: 'Additional notes (optional)'
                }
            },
            required: ['affectedUserId', 'currencyType', 'amount', 'reason']
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Currency gifted successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        transactionId: { type: 'string' },
                        userId: { type: 'string' },
                        userName: { type: 'string' },
                        amount: { type: 'number' },
                        newBalance: { type: 'number' }
                    }
                }
            }
        }
    })
    async giftCurrency(
        @Request() req: any,
        @Body()
        body: {
            affectedUserId: string
            currencyType: CurrencyType
            amount: number
            reason: string
            notes?: string
        }
    ) {
        const adminId = req.user.uuid
        const result = await this.adminService.giftCurrencyToUser(
            adminId,
            body.affectedUserId,
            body.currencyType,
            body.amount,
            body.reason,
            body.notes
        )

        return {
            success: true,
            message: `Successfully gifted ${body.amount} ${body.currencyType} to user`,
            data: {
                transactionId: result.transaction.uuid,
                userId: result.user.id,
                userName: result.user.name,
                amount: body.amount,
                currencyType: body.currencyType,
                newBalance: result.user.newBalance
            }
        }
    }

    @Post('adjust-currency')
    @ApiOperation({
        summary: 'Adjust user currency (Admin Only)',
        description: 'Add or deduct currency with proper tracking and reason'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                affectedUserId: { type: 'string' },
                currencyType: {
                    type: 'string',
                    enum: ['bins', 'diamonds']
                },
                amount: {
                    type: 'number',
                    description: 'Positive to add, negative to deduct'
                },
                transactionType: {
                    type: 'string',
                    enum: ['adjustment', 'compensation', 'bonus', 'penalty']
                },
                reason: { type: 'string' },
                notes: { type: 'string' }
            },
            required: [
                'affectedUserId',
                'currencyType',
                'amount',
                'transactionType',
                'reason'
            ]
        }
    })
    async adjustCurrency(
        @Request() req: any,
        @Body()
        body: {
            affectedUserId: string
            currencyType: CurrencyType
            amount: number
            transactionType: AdminTransactionType
            reason: string
            notes?: string
        }
    ) {
        const adminId = req.user.uuid
        const result = await this.adminService.adjustUserCurrency(
            adminId,
            body.affectedUserId,
            body.currencyType,
            body.amount,
            body.transactionType,
            body.reason,
            body.notes
        )

        return {
            success: true,
            message: 'Currency adjusted successfully',
            data: result
        }
    }

    @Put('conversion-rates/:type')
    @ApiOperation({
        summary: 'Update conversion rates (Admin Only)',
        description: 'Update bins/diamond/USD conversion rates with tracking'
    })
    @ApiParam({
        name: 'type',
        enum: ConversionType,
        description: 'Conversion type to update'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                sourceValue: { type: 'number', example: 3 },
                targetValue: { type: 'number', example: 1 },
                commissionPercent: { type: 'number', example: 70 },
                reason: { type: 'string', example: 'Market adjustment' }
            },
            required: ['sourceValue', 'targetValue']
        }
    })
    async updateConversionRate(
        @Request() req: any,
        @Param('type') conversionType: ConversionType,
        @Body()
        body: {
            sourceValue: number
            targetValue: number
            commissionPercent?: number
            reason?: string
        }
    ) {
        const adminId = req.user.uuid
        const result = await this.adminService.updateConversionRate(
            adminId,
            conversionType,
            body.sourceValue,
            body.targetValue,
            body.commissionPercent,
            body.reason
        )

        return {
            success: true,
            message: 'Conversion rate updated successfully',
            data: {
                conversionType,
                oldRate:
                    result.oldConfig.targetValue / result.oldConfig.sourceValue,
                newRate:
                    result.newConfig.targetValue / result.newConfig.sourceValue,
                oldSourceValue: result.oldConfig.sourceValue,
                oldTargetValue: result.oldConfig.targetValue,
                newSourceValue: result.newConfig.sourceValue,
                newTargetValue: result.newConfig.targetValue,
                transactionId: result.transaction.uuid
            }
        }
    }

    @Get('transactions')
    @ApiOperation({
        summary: 'Get admin transaction history (Admin Only)',
        description: 'View all admin transactions with filtering options'
    })
    @ApiQuery({ name: 'adminId', required: false })
    @ApiQuery({ name: 'userId', required: false })
    @ApiQuery({ name: 'type', enum: AdminTransactionType, required: false })
    @ApiQuery({ name: 'page', type: Number, required: false, description: 'Page number (starts at 1)' })
    @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Items per page' })
    async getTransactionHistory(
        @Query('adminId') adminId?: string,
        @Query('userId') userId?: string,
        @Query('type') transactionType?: AdminTransactionType,
        @Query('page') page?: string | number,
        @Query('limit') limit?: string | number
    ) {
        // Convert to numbers and provide defaults
        const pageNum = page ? Math.max(1, parseInt(page.toString(), 10)) : 1;
        const limitNum = limit ? parseInt(limit.toString(), 10) : 20;

        // Calculate offset from page number (page 1 = offset 0)
        const offsetNum = (pageNum - 1) * limitNum;

        const result = await this.adminService.getAdminTransactionHistory(
            adminId,
            userId,
            transactionType,
            limitNum,
            offsetNum
        );

        return {
            success: true,
            message: 'Transaction history retrieved',
            data: {
                transactions: result.transactions,
                total: result.total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(result.total / limitNum)
            }
        };
    }

    @Get('dashboard')
    @ApiOperation({
        summary: 'Get admin dashboard statistics (Admin Only)',
        description: 'Overview of system statistics and recent activities'
    })
    async getDashboardStats() {
        const stats = await this.adminService.getAdminDashboardStats()

        return {
            success: true,
            message: 'Dashboard statistics retrieved',
            data: stats
        }
    }

    @Get('transactions/user/:userId')
    @ApiOperation({
        summary: 'Get user admin transaction history (Admin Only)',
        description: 'View all admin transactions for a specific user'
    })
    @ApiParam({ name: 'userId', description: 'User UUID' })
    @ApiQuery({ name: 'limit', type: Number, required: false })
    @ApiQuery({ name: 'offset', type: Number, required: false })
    async getUserTransactionHistory(
        @Param('userId') userId: string,
        @Query('limit') limit: number = 50,
        @Query('offset') offset: number = 0
    ) {
        const result = await this.adminService.getAdminTransactionHistory(
            undefined,
            userId,
            undefined,
            limit,
            offset
        )

        return {
            success: true,
            message: 'User transaction history retrieved',
            data: result
        }
    }

    // ==================== TASK MANAGEMENT ====================

    @Post('tasks')
    @ApiOperation({
        summary: 'Create a new daily task (Admin Only)',
        description:
            'Create a new task for users or rooms with specific requirements'
    })
    @ApiBody({
        type: CreateTaskDto,
        examples: {
            userTask: {
                summary: 'User Task Example',
                description: 'Create a task for all users to join video calls',
                value: {
                    taskId: 'join_video_calls',
                    icon: 'video_call',
                    title: 'Join 3 Video Calls',
                    description:
                        'Join video calls with friends to earn rewards',
                    total: 3,
                    reward: 50,
                    color: '#8E24AA',
                    taskType: 'global',
                    category: 'user_tab',
                    sortOrder: 1,
                    metadata: {
                        rewardType: 'bins',
                        requiredLevel: 1,
                        repeatDaily: true
                    }
                }
            },
            sendMessagesTask: {
                summary: 'Send Messages Task',
                description: 'Create a messaging task for users',
                value: {
                    taskId: 'send_messages',
                    icon: 'message',
                    title: 'Send 20 Messages',
                    description: 'Chat with friends and send 20 messages today',
                    total: 20,
                    reward: 30,
                    color: '#1976D2',
                    taskType: 'global',
                    category: 'user_tab',
                    sortOrder: 2,
                    metadata: {
                        rewardType: 'bins',
                        repeatDaily: true
                    }
                }
            },
            sendGiftsTask: {
                summary: 'Send Gifts Task',
                description: 'Create a gift sending task',
                value: {
                    taskId: 'send_gifts',
                    icon: 'favorite',
                    title: 'Send 10 Gifts',
                    description: 'Show your appreciation by sending gifts',
                    total: 10,
                    reward: 100,
                    color: '#EC407A',
                    taskType: 'global',
                    category: 'user_tab',
                    sortOrder: 3,
                    metadata: {
                        rewardType: 'diamonds',
                        repeatDaily: true,
                        requirements: {
                            minGiftValue: 10
                        }
                    }
                }
            },
            dailyBonusTask: {
                summary: 'Daily Bonus Task',
                description: 'Single-action daily bonus collection task',
                value: {
                    taskId: 'collect_bonus',
                    icon: 'star',
                    title: 'Collect Daily Bonus',
                    description: 'Claim your daily login bonus',
                    total: 1,
                    reward: 25,
                    color: '#FFB300',
                    taskType: 'global',
                    category: 'user_tab',
                    sortOrder: 4,
                    metadata: {
                        rewardType: 'bins',
                        repeatDaily: true
                    }
                }
            },
            inviteFriendsTask: {
                summary: 'Invite Friends Task',
                description: 'Social task to invite friends',
                value: {
                    taskId: 'invite_friends',
                    icon: 'people',
                    title: 'Invite 2 Friends',
                    description: 'Invite friends to join the platform',
                    total: 2,
                    reward: 200,
                    color: '#388E3C',
                    taskType: 'global',
                    category: 'user_tab',
                    sortOrder: 5,
                    metadata: {
                        rewardType: 'diamonds',
                        repeatDaily: false,
                        requirements: {
                            friendsMustJoin: true
                        }
                    }
                }
            },
            roomGiftsTask: {
                summary: 'Room-Specific Gift Task',
                description:
                    'Create a task for sending gifts in a specific room',
                value: {
                    taskId: 'room_gifts_vip',
                    icon: 'favorite',
                    title: 'Send 15 Gifts in Room',
                    description:
                        'Support your favorite broadcasters by sending gifts',
                    total: 15,
                    reward: 250,
                    color: '#FF6B6B',
                    taskType: 'room',
                    category: 'room_tab',
                    roomId: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
                    sortOrder: 1,
                    metadata: {
                        rewardType: 'diamonds',
                        requiredLevel: 5,
                        repeatDaily: true
                    }
                }
            },
            roomCommentsTask: {
                summary: 'Room Comments Task',
                description: 'Create a task for sending comments in rooms',
                value: {
                    taskId: 'room_comments',
                    icon: 'chat_bubble',
                    title: 'Send 30 Comments',
                    description: 'Engage with the community by commenting',
                    total: 30,
                    reward: 40,
                    color: '#42A5F5',
                    taskType: 'room',
                    category: 'room_tab',
                    roomId: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
                    sortOrder: 2,
                    metadata: {
                        rewardType: 'bins',
                        repeatDaily: true
                    }
                }
            },
            roomSeatTimeTask: {
                summary: 'Room Seat Time Task',
                description: 'Create a task for staying in room seats',
                value: {
                    taskId: 'room_seat_time',
                    icon: 'event_seat',
                    title: 'Sit for 30 Minutes',
                    description: 'Stay in a room seat for 30 minutes',
                    total: 30,
                    reward: 150,
                    color: '#9C27B0',
                    taskType: 'room',
                    category: 'room_tab',
                    roomId: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
                    sortOrder: 3,
                    metadata: {
                        rewardType: 'bins',
                        repeatDaily: true,
                        requirements: {
                            unit: 'minutes',
                            mustBeInSeat: true
                        }
                    }
                }
            },
            pkBattleTask: {
                summary: 'PK Battle Task',
                description: 'Create a task for winning PK battles',
                value: {
                    taskId: 'win_pk_battles',
                    icon: 'emoji_events',
                    title: 'Win 3 PK Battles',
                    description: 'Compete and win PK battles in rooms',
                    total: 3,
                    reward: 300,
                    color: '#FF5722',
                    taskType: 'global',
                    category: 'room_tab',
                    sortOrder: 4,
                    metadata: {
                        rewardType: 'diamonds',
                        requiredLevel: 10,
                        repeatDaily: true
                    }
                }
            },
            roomRankingTask: {
                summary: 'Room Ranking Task',
                description: 'Create a task for achieving room rankings',
                value: {
                    taskId: 'room_top_10',
                    icon: 'leaderboard',
                    title: 'Reach Top 10 in Room',
                    description: 'Climb the room leaderboard to top 10',
                    total: 1,
                    reward: 500,
                    color: '#FFC107',
                    taskType: 'room',
                    category: 'room_tab',
                    roomId: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
                    sortOrder: 5,
                    metadata: {
                        rewardType: 'diamonds',
                        requiredLevel: 15,
                        repeatDaily: false,
                        requirements: {
                            rankingType: 'daily',
                            maxRank: 10
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Task created successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: {
                    type: 'string',
                    example: 'Task created successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        uuid: {
                            type: 'string',
                            example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
                        },
                        taskId: { type: 'string', example: 'join_video_calls' },
                        icon: { type: 'string', example: 'video_call' },
                        title: {
                            type: 'string',
                            example: 'Join 3 Video Calls'
                        },
                        description: {
                            type: 'string',
                            example:
                                'Join video calls with friends to earn rewards'
                        },
                        total: { type: 'number', example: 3 },
                        reward: { type: 'number', example: 50 },
                        color: { type: 'string', example: '#8E24AA' },
                        taskType: { type: 'string', example: 'global' },
                        category: { type: 'string', example: 'user_tab' },
                        roomId: {
                            type: 'string',
                            nullable: true,
                            example: null
                        },
                        isActive: { type: 'boolean', example: true },
                        sortOrder: { type: 'number', example: 1 },
                        metadata: {
                            type: 'object',
                            example: {
                                rewardType: 'bins',
                                requiredLevel: 1,
                                repeatDaily: true
                            }
                        },
                        createdBy: { type: 'string', example: 'admin-uuid' },
                        createdAt: {
                            type: 'string',
                            example: '2025-10-18T12:00:00Z'
                        },
                        updatedAt: {
                            type: 'string',
                            example: '2025-10-18T12:00:00Z'
                        }
                    }
                }
            }
        }
    })
    async createTask(@Body() createTaskDto: CreateTaskDto, @Request() req) {
        const adminId = req.user.uuid
        const task = await this.taskService.createTask(createTaskDto, adminId)

        return {
            success: true,
            message: 'Task created successfully',
            data: task
        }
    }

    @Get('tasks')
    @ApiOperation({
        summary: 'Get all tasks (Admin Only)',
        description:
            'Retrieve all tasks with optional filters by category or room'
    })
    @ApiQuery({
        name: 'category',
        enum: TaskCategory,
        required: false,
        description: 'Filter by task category (user_tab or room_tab)',
        example: 'user_tab'
    })
    @ApiQuery({
        name: 'roomId',
        type: String,
        required: false,
        description: 'Filter by specific room UUID',
        example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Tasks retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: {
                    type: 'string',
                    example: 'Tasks retrieved successfully'
                },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            uuid: { type: 'string' },
                            taskId: { type: 'string' },
                            icon: { type: 'string' },
                            title: { type: 'string' },
                            total: { type: 'number' },
                            reward: { type: 'number' },
                            color: { type: 'string' },
                            taskType: { type: 'string' },
                            category: { type: 'string' },
                            roomId: { type: 'string', nullable: true },
                            isActive: { type: 'boolean' },
                            sortOrder: { type: 'number' }
                        }
                    },
                    example: [
                        {
                            uuid: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
                            taskId: 'join_video_calls',
                            icon: 'video_call',
                            title: 'Join 3 Video Calls',
                            total: 3,
                            reward: 50,
                            color: '#8E24AA',
                            taskType: 'global',
                            category: 'user_tab',
                            roomId: null,
                            isActive: true,
                            sortOrder: 1
                        },
                        {
                            uuid: '234e5678-e89b-12d3-a456-426614174001',
                            taskId: 'send_messages',
                            icon: 'message',
                            title: 'Send 20 Messages',
                            total: 20,
                            reward: 30,
                            color: '#1976D2',
                            taskType: 'global',
                            category: 'user_tab',
                            roomId: null,
                            isActive: true,
                            sortOrder: 2
                        }
                    ]
                }
            }
        }
    })
    async getAllTasks(
        @Query('category') category?: TaskCategory,
        @Query('roomId') roomId?: string
    ) {
        const tasks = await this.taskService.getAllTasks(category, roomId)

        return {
            success: true,
            message: 'Tasks retrieved successfully',
            data: tasks
        }
    }

    @Put('tasks/:taskId')
    @ApiOperation({
        summary: 'Update a task (Admin Only)',
        description:
            'Update task properties like title, reward, isActive status, or any other field. All fields are optional for partial updates.'
    })
    @ApiParam({
        name: 'taskId',
        description: 'Task UUID to update',
        example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
    })
    @ApiBody({
        type: UpdateTaskDto,
        examples: {
            updateTitle: {
                summary: 'Update Task Title',
                description: 'Change the title of an existing task',
                value: {
                    title: 'Join 5 Video Calls (Updated)',
                    description:
                        'Join video calls with friends to earn more rewards'
                }
            },
            updateReward: {
                summary: 'Update Reward Amount',
                description: 'Increase or decrease the reward',
                value: {
                    reward: 75,
                    color: '#9C27B0'
                }
            },
            updateTotal: {
                summary: 'Update Total Requirement',
                description: 'Change the completion requirement',
                value: {
                    total: 5,
                    reward: 80
                }
            },
            deactivateTask: {
                summary: 'Deactivate Task',
                description: 'Disable a task without deleting it',
                value: {
                    isActive: false
                }
            },
            updateMetadata: {
                summary: 'Update Task Metadata',
                description: 'Change reward type or requirements',
                value: {
                    metadata: {
                        rewardType: 'diamonds',
                        requiredLevel: 5,
                        repeatDaily: true
                    }
                }
            },
            fullUpdate: {
                summary: 'Complete Update',
                description: 'Update multiple fields at once',
                value: {
                    title: 'Send 15 Messages',
                    description: 'Chat actively with friends',
                    total: 15,
                    reward: 50,
                    color: '#2196F3',
                    isActive: true,
                    sortOrder: 2,
                    metadata: {
                        rewardType: 'bins',
                        requiredLevel: 1,
                        repeatDaily: true
                    }
                }
            },
            updateRoomTask: {
                summary: 'Update Room-Specific Task',
                description: 'Modify a room task with new requirements',
                value: {
                    title: 'Send 20 Gifts in Room',
                    total: 20,
                    reward: 300,
                    roomId: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
                    metadata: {
                        rewardType: 'diamonds',
                        requiredLevel: 10,
                        repeatDaily: true
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Task updated successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: {
                    type: 'string',
                    example: 'Task updated successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        uuid: {
                            type: 'string',
                            example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
                        },
                        taskId: { type: 'string', example: 'join_video_calls' },
                        icon: { type: 'string', example: 'video_call' },
                        title: {
                            type: 'string',
                            example: 'Join 5 Video Calls (Updated)'
                        },
                        description: {
                            type: 'string',
                            example:
                                'Join video calls with friends to earn more rewards'
                        },
                        total: { type: 'number', example: 5 },
                        reward: { type: 'number', example: 75 },
                        color: { type: 'string', example: '#9C27B0' },
                        taskType: { type: 'string', example: 'global' },
                        category: { type: 'string', example: 'user_tab' },
                        isActive: { type: 'boolean', example: true },
                        sortOrder: { type: 'number', example: 1 },
                        updatedAt: {
                            type: 'string',
                            example: '2025-10-18T12:30:00Z'
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Task not found'
    })
    async updateTask(
        @Param('taskId') taskId: string,
        @Body() updateTaskDto: UpdateTaskDto
    ) {
        const task = await this.taskService.updateTask(taskId, updateTaskDto)

        return {
            success: true,
            message: 'Task updated successfully',
            data: task
        }
    }

    @Delete('tasks/:taskId')
    @ApiOperation({
        summary: 'Delete a task (Admin Only)',
        description:
            'Permanently remove a task from the system. Note: This will delete the task definition but progress records will remain for historical data.'
    })
    @ApiParam({
        name: 'taskId',
        description: 'Task UUID to delete',
        example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Task deleted successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                message: {
                    type: 'string',
                    example: 'Task deleted successfully'
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Task not found',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Task not found' },
                statusCode: { type: 'number', example: 404 }
            }
        }
    })
    async deleteTask(@Param('taskId') taskId: string) {
        await this.taskService.deleteTask(taskId)

        return {
            success: true,
            message: 'Task deleted successfully'
        }
    }
}
