import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Param,
    Patch,
    Query,
    Request,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'
import { UserService } from './user.service'

@ApiTags('👤 Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
    constructor(private readonly userService: UserService) {}

    // @Post()
    // @ApiOperation({
    //     summary: 'Create a new user',
    //     description: 'Creates a new user account with the provided information'
    // })
    // @ApiBody({ type: CreateUserDto })
    // @ApiResponse({
    //     status: HttpStatus.CREATED,
    //     description: 'User successfully created',
    //     type: User
    // })
    // @ApiResponse({
    //     status: HttpStatus.CONFLICT,
    //     description: 'User with this email or username already exists'
    // })
    // @ApiResponse({
    //     status: HttpStatus.BAD_REQUEST,
    //     description: 'Invalid input data'
    // })
    // create(@Body() createUserDto: CreateUserDto) {
    //     return {
    //         statusCode: HttpStatus.CREATED,
    //         message: 'User created successfully',
    //         data: this.userService.create(createUserDto)
    //     }
    // }

    @Get()
    @ApiOperation({
        summary: 'Get all users',
        description: 'Retrieve a list of all active users'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of users retrieved successfully',
        type: [User]
    })
    async findAll() {
        return {
            statusCode: HttpStatus.OK,
            message: 'Users fetched successfully',
            data: await this.userService.findAll()
        }
    }

    @Get('search')
    @ApiOperation({
        summary: 'Search users',
        description: 'Search users by username or display name'
    })
    @ApiQuery({
        name: 'q',
        required: true,
        description: 'Search query string',
        example: 'john'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Search results',
        type: [User]
    })
    async search(@Query('q') query: string) {
        return {
            statusCode: HttpStatus.OK,
            message: 'Users search results',
            data: await this.userService.searchUsers(query)
        }
    }

    @Get('profile')
    @ApiOperation({
        summary: 'Get current user profile',
        description: 'Get the profile of the authenticated user'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User profile retrieved successfully',
        type: User
    })
    async getProfile(@Request() req) {
        return {
            statusCode: HttpStatus.OK,
            message: 'User profile fetched successfully',
            data: await this.userService.findOne(req.user.uuid)
        }
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get user by ID',
        description: 'Retrieve a specific user by their UUID'
    })
    @ApiParam({
        name: 'id',
        description: 'User UUID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User found',
        type: User
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'User not found'
    })
    async findOne(@Param('id') id: string) {
        return {
            statusCode: HttpStatus.OK,
            message: 'User fetched successfully',
            data: await this.userService.findOne(id)
        }
    }

    @Patch(':id')
    @ApiOperation({
        summary: 'Update user',
        description: 'Update user information with optional avatar upload'
    })
    @ApiParam({
        name: 'id',
        description: 'User UUID',
        example: '123e4567-e89b-12d3-a456-426614174000',
        required: false
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                displayName: { type: 'string', example: 'John Doe' },
                bio: { type: 'string', example: 'Software Developer' },
                avatar: {
                    type: 'string',
                    format: 'binary',
                    description: 'Avatar image file'
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User updated successfully',
        type: User
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'User not found'
    })
    @UseInterceptors(
        FileInterceptor('avatar', {
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                    return cb(
                        new BadRequestException('Only image files are allowed'),
                        false
                    )
                }
                cb(null, true)
            },
            limits: {
                fileSize: 5 * 1024 * 1024 // 5MB limit
            }
        })
    )
    async update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
        @UploadedFile() avatarFile?: Express.Multer.File
    ) {
        return {
            statusCode: HttpStatus.OK,
            message: 'User updated successfully',
            data: await this.userService.update(
                req.user.uuid === id ? req.user.uuid : id,
                updateUserDto,
                avatarFile
            )
        }
    }

    @Patch('profile/avatar')
    @ApiOperation({
        summary: 'Update current user avatar',
        description: 'Update the avatar of the authenticated user'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                avatar: {
                    type: 'string',
                    format: 'binary',
                    description: 'Avatar image file'
                }
            },
            required: ['avatar']
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Avatar updated successfully',
        type: User
    })
    @UseInterceptors(
        FileInterceptor('avatar', {
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                    return cb(
                        new BadRequestException('Only image files are allowed'),
                        false
                    )
                }
                cb(null, true)
            },
            limits: {
                fileSize: 5 * 1024 * 1024 // 5MB limit
            }
        })
    )
    async updateProfileAvatar(
        @Request() req: any,
        @UploadedFile() avatarFile: Express.Multer.File
    ) {
        if (!avatarFile) {
            throw new BadRequestException('Avatar file is required')
        }

        return {
            statusCode: HttpStatus.OK,
            message: 'Avatar updated successfully',
            data: await this.userService.update(req.user.uuid, {}, avatarFile)
        }
    }

    @Patch(':id/status')
    @ApiOperation({
        summary: 'Update user status',
        description: 'Update user online status'
    })
    @ApiParam({
        name: 'id',
        description: 'User UUID'
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['online', 'offline', 'away', 'busy'],
                    example: 'online'
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Status updated successfully'
    })
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: string
    ) {
        return {
            statusCode: HttpStatus.OK,
            message: 'User status updated successfully',
            data: await this.userService.updateStatus(id, status as any)
        }
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete user',
        description: 'Soft delete a user (sets isActive to false)'
    })
    @ApiParam({
        name: 'id',
        description: 'User UUID'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User deleted successfully'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'User not found'
    })
    async remove(@Param('id') id: string) {
        return {
            statusCode: HttpStatus.OK,
            message: 'User deleted successfully',
            data: await this.userService.remove(id)
        }
    }
}
