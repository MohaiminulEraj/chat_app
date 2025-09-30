import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Request,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors
} from '@nestjs/common'
import {
    FileFieldsInterceptor,
    FileInterceptor
} from '@nestjs/platform-express'
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UpdateUserDto } from './dto/update-user.dto'
import { UpdateUserAchievementsDto } from './dto/update-user-achievements.dto'
import { User } from './entities/user.entity'
import { UserService } from './user.service'
import { IPaginationOptions } from 'nestjs-typeorm-paginate'

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

    @Get('recommendations')
    @ApiOperation({
        summary: 'Get user recommendations',
        description:
            'Get paginated list of user recommendations for sending friend requests'
    })
    @ApiQuery({
        name: 'page',
        description: 'Page number',
        type: Number,
        required: false,
        example: 1
    })
    @ApiQuery({
        name: 'limit',
        description: 'Number of items per page',
        type: Number,
        required: false,
        example: 10
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User recommendations retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'User recommendations fetched successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/User' }
                        },
                        meta: {
                            type: 'object',
                            properties: {
                                totalItems: { type: 'number', example: 50 },
                                itemCount: { type: 'number', example: 10 },
                                itemsPerPage: { type: 'number', example: 10 },
                                totalPages: { type: 'number', example: 5 },
                                currentPage: { type: 'number', example: 1 }
                            }
                        },
                        links: {
                            type: 'object',
                            properties: {
                                first: {
                                    type: 'string',
                                    example:
                                        'http://localhost:3000/users/recommendations?limit=10'
                                },
                                previous: {
                                    type: 'string',
                                    example:
                                        'http://localhost:3000/users/recommendations?page=1&limit=10'
                                },
                                next: {
                                    type: 'string',
                                    example:
                                        'http://localhost:3000/users/recommendations?page=2&limit=10'
                                },
                                last: {
                                    type: 'string',
                                    example:
                                        'http://localhost:3000/users/recommendations?page=5&limit=10'
                                }
                            }
                        }
                    }
                }
            }
        }
    })
    async getRecommendations(
        @Request() req: any,
        @Query('page', new ParseIntPipe({ optional: true })) page?: number,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
    ) {
        const options: IPaginationOptions = {
            page: page || 1,
            limit: limit || 10,
            route: req.url
        }

        const data = await this.userService.getRecommendations(
            req.user.uuid,
            options
        )

        return {
            statusCode: HttpStatus.OK,
            message: 'User recommendations fetched successfully',
            data
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

    @Get('achievement')
    @ApiOperation({
        summary: 'Get user achievement data',
        description:
            'Get user achievement data including purchased gifts, entry effects, and frames'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User achievement data retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: {
                    type: 'string',
                    example: 'User achievement data fetched successfully'
                },
                data: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        userId: { type: 'string' },
                        name: { type: 'string' },
                        country: { type: 'string' },
                        email: { type: 'string' },
                        image: { type: 'string' },
                        coverImage: { type: 'string' },
                        level: { type: 'number' },
                        balance: { type: 'number' },
                        frameId: { type: 'string', nullable: true },
                        frameImage: { type: 'string', nullable: true },
                        badge: { type: 'array', items: { type: 'string' } },
                        gift: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: { type: 'string' },
                                    name: { type: 'string' },
                                    achievementImage: { type: 'string' },
                                    achievementDescription: { type: 'string' },
                                    count: { type: 'number' }
                                }
                            }
                        },
                        entryEffect: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: { type: 'string' },
                                    name: { type: 'string' },
                                    achievementImage: { type: 'string' },
                                    achievementDescription: { type: 'string' },
                                    count: { type: 'number' }
                                }
                            }
                        },
                        frame: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: { type: 'string' },
                                    name: { type: 'string' },
                                    achievementImage: { type: 'string' },
                                    achievementDescription: { type: 'string' },
                                    count: { type: 'number' }
                                }
                            }
                        },
                        friend: {
                            type: 'number',
                            description: 'Number of friends'
                        },
                        follower: {
                            type: 'number',
                            description: 'Number of followers'
                        },
                        following: {
                            type: 'number',
                            description: 'Number of people being followed'
                        },
                        visitorCount: {
                            type: 'number',
                            description:
                                'Number of unique visitors to the profile'
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'User not found'
    })
    async getAchievement(@Request() req) {
        return {
            statusCode: HttpStatus.OK,
            message: 'User achievement data fetched successfully',
            data: await this.userService.getUserAchievementData(req.user.uuid)
        }
    }

    @Patch('achievement')
    @ApiOperation({
        summary: 'Update user achievement data',
        description:
            'Update user achievement data including purchased gifts, entry effects, frames, and upload image/cover image'
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                // Achievement fields
                purchasedGifts: {
                    type: 'string',
                    description: 'JSON string of purchased gifts array'
                },
                entryEffects: {
                    type: 'string',
                    description: 'JSON string of entry effects array'
                },
                frames: {
                    type: 'string',
                    description: 'JSON string of frames array'
                },
                level: { type: 'number', description: 'User level' },
                balance: { type: 'number', description: 'User balance' },
                frameId: { type: 'string', description: 'Frame ID' },
                frameImage: { type: 'string', description: 'Frame image URL' },
                badge: {
                    type: 'string',
                    description: 'JSON string of badges array'
                },
                // Profile fields
                displayName: { type: 'string', description: 'Display name' },
                bio: { type: 'string', description: 'User bio' },
                country: { type: 'string', description: 'User country' },
                // File uploads
                image: {
                    type: 'string',
                    format: 'binary',
                    description:
                        'User profile image (supports JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO formats, max 10MB)'
                },
                coverImage: {
                    type: 'string',
                    format: 'binary',
                    description:
                        'User cover image (supports JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO formats, max 10MB)'
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User achievement data updated successfully',
        type: User
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'User not found'
    })
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'image', maxCount: 1 },
                { name: 'coverImage', maxCount: 1 }
            ],
            {
                fileFilter: (req, file, cb) => {
                    // Accept all common image formats including modern formats
                    const allowedMimeTypes = [
                        // JPEG formats
                        'image/jpeg',
                        'image/jpg',
                        'image/pjpeg', // Progressive JPEG

                        // PNG formats
                        'image/png',
                        'image/x-png',

                        // GIF formats
                        'image/gif',

                        // WebP formats
                        'image/webp',

                        // BMP formats
                        'image/bmp',
                        'image/x-bmp',
                        'image/x-bitmap',
                        'image/x-win-bitmap',
                        'image/x-windows-bmp',
                        'image/ms-bmp',

                        // TIFF formats
                        'image/tiff',
                        'image/tif',
                        'image/x-tiff',

                        // SVG formats
                        'image/svg+xml',
                        'image/svg',

                        // Modern formats
                        'image/avif',
                        'image/heic',
                        'image/heif',

                        // Icon formats
                        'image/x-icon',
                        'image/vnd.microsoft.icon',
                        'image/ico',

                        // Additional formats
                        'image/jfif',
                        'image/pjp',
                        'image/jpg2',
                        'image/jp2'
                    ]

                    if (!allowedMimeTypes.includes(file.mimetype)) {
                        return cb(
                            new BadRequestException(
                                `Unsupported file type: ${file.mimetype}. Supported formats: JPEG/JPG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO, JFIF`
                            ),
                            false
                        )
                    }
                    cb(null, true)
                },
                limits: {
                    fileSize: 10 * 1024 * 1024 // 10MB limit
                }
            }
        )
    )
    async updateAchievement(
        @Request() req,
        @Body() updateDto: UpdateUserAchievementsDto,
        @UploadedFiles()
        files?: {
            image?: Express.Multer.File[]
            coverImage?: Express.Multer.File[]
        }
    ) {
        // Parse JSON fields if they are strings
        const parsedData = { ...updateDto }

        if (typeof updateDto.purchasedGifts === 'string') {
            try {
                parsedData.purchasedGifts = JSON.parse(
                    updateDto.purchasedGifts as any
                )
            } catch (error) {
                throw new BadRequestException(
                    'Invalid purchasedGifts JSON format'
                )
            }
        }

        if (typeof updateDto.entryEffects === 'string') {
            try {
                parsedData.entryEffects = JSON.parse(
                    updateDto.entryEffects as any
                )
            } catch (error) {
                throw new BadRequestException(
                    'Invalid entryEffects JSON format'
                )
            }
        }

        if (typeof updateDto.frames === 'string') {
            try {
                parsedData.frames = JSON.parse(updateDto.frames as any)
            } catch (error) {
                throw new BadRequestException('Invalid frames JSON format')
            }
        }

        if (typeof updateDto.badge === 'string') {
            try {
                parsedData.badge = JSON.parse(updateDto.badge as any)
            } catch (error) {
                throw new BadRequestException('Invalid badge JSON format')
            }
        }

        // Prepare file objects for service
        const fileUploads = {
            image: files?.image?.[0],
            coverImage: files?.coverImage?.[0]
        }

        return {
            statusCode: HttpStatus.OK,
            message: 'User achievement data updated successfully',
            data: await this.userService.updateUserAchievements(
                req.user.uuid,
                parsedData,
                fileUploads
            )
        }
    }

    @Post('visit/:id')
    @ApiOperation({
        summary: 'Record profile visit',
        description:
            "Record that the current user visited another user's profile"
    })
    @ApiParam({
        name: 'id',
        description: 'UUID of the user whose profile was visited',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Profile visit recorded successfully'
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'User not found'
    })
    async recordVisit(@Request() req, @Param('id') visitedUserId: string) {
        await this.userService.recordProfileVisit(req.user.uuid, visitedUserId)
        return {
            statusCode: HttpStatus.OK,
            message: 'Profile visit recorded successfully'
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
    async findOne(@Request() req, @Param('id') id: string) {
        return {
            statusCode: HttpStatus.OK,
            message: 'User fetched successfully',
            data: await this.userService.findOneWithVisitTracking(
                id,
                req.user?.uuid
            )
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
                    description:
                        'Avatar image file (supports JPEG/JPG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO, JFIF formats, max 10MB)'
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
                // Accept all common image formats including modern formats
                const allowedMimeTypes = [
                    // JPEG formats
                    'image/jpeg',
                    'image/jpg',
                    'image/pjpeg', // Progressive JPEG

                    // PNG formats
                    'image/png',
                    'image/x-png',

                    // GIF formats
                    'image/gif',

                    // WebP formats
                    'image/webp',

                    // BMP formats
                    'image/bmp',
                    'image/x-bmp',
                    'image/x-bitmap',
                    'image/x-win-bitmap',
                    'image/x-windows-bmp',
                    'image/ms-bmp',

                    // TIFF formats
                    'image/tiff',
                    'image/tif',
                    'image/x-tiff',

                    // SVG formats
                    'image/svg+xml',
                    'image/svg',

                    // Modern formats
                    'image/avif',
                    'image/heic',
                    'image/heif',

                    // Icon formats
                    'image/x-icon',
                    'image/vnd.microsoft.icon',
                    'image/ico',

                    // Additional formats
                    'image/jfif',
                    'image/pjp',
                    'image/jpg2',
                    'image/jp2'
                ]

                if (!allowedMimeTypes.includes(file.mimetype)) {
                    return cb(
                        new BadRequestException(
                            `Unsupported image format: ${file.mimetype}. Supported formats: JPEG/JPG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO, JFIF`
                        ),
                        false
                    )
                }
                cb(null, true)
            },
            limits: {
                fileSize: 10 * 1024 * 1024 // Increased to 10MB limit for higher quality images
            }
        })
    )
    async update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
        @UploadedFile() avatarFile?: Express.Multer.File
    ) {
        try {
            // Log the incoming request data for debugging
            console.log('Update request data:', {
                userId: id,
                requestUserId: req.user?.uuid,
                updateData: updateUserDto,
                hasFile: !!avatarFile,
                fileName: avatarFile?.originalname
            })

            // Check if user is trying to update their own profile or has admin rights
            const targetUserId = req.user.uuid === id ? req.user.uuid : id

            const updatedUser = await this.userService.update(
                targetUserId,
                updateUserDto,
                avatarFile
            )

            return {
                statusCode: HttpStatus.OK,
                message: 'User updated successfully',
                data: updatedUser
            }
        } catch (error) {
            // Log the specific error for debugging
            console.error('User update error:', {
                error: error.message,
                stack: error.stack,
                status: error.status,
                response: error.response
            })

            if (error.status) {
                throw error // Re-throw HTTP exceptions
            }

            throw new BadRequestException(
                error.message || 'Failed to update user'
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
                    description:
                        'Avatar image file (supports JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO formats, max 10MB)'
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
                // Accept all common image formats including modern formats
                const allowedMimeTypes = [
                    // JPEG formats
                    'image/jpeg',
                    'image/jpg',
                    'image/pjpeg', // Progressive JPEG

                    // PNG formats
                    'image/png',
                    'image/x-png',

                    // GIF formats
                    'image/gif',

                    // WebP formats
                    'image/webp',

                    // BMP formats
                    'image/bmp',
                    'image/x-bmp',
                    'image/x-bitmap',
                    'image/x-win-bitmap',
                    'image/x-windows-bmp',
                    'image/ms-bmp',

                    // TIFF formats
                    'image/tiff',
                    'image/tif',
                    'image/x-tiff',

                    // SVG formats
                    'image/svg+xml',
                    'image/svg',

                    // Modern formats
                    'image/avif',
                    'image/heic',
                    'image/heif',

                    // Icon formats
                    'image/x-icon',
                    'image/vnd.microsoft.icon',
                    'image/ico',

                    // Additional formats
                    'image/jfif',
                    'image/pjp',
                    'image/jpg2',
                    'image/jp2'
                ]

                if (!allowedMimeTypes.includes(file.mimetype)) {
                    return cb(
                        new BadRequestException(
                            `Unsupported image format: ${file.mimetype}. Supported formats: JPEG/JPG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO, JFIF`
                        ),
                        false
                    )
                }
                cb(null, true)
            },
            limits: {
                fileSize: 10 * 1024 * 1024 // Increased to 10MB limit for higher quality images
            }
        })
    )
    async updateProfileAvatar(
        @Request() req: any,
        @UploadedFile() avatarFile: Express.Multer.File
    ) {
        try {
            if (!avatarFile) {
                throw new BadRequestException('Avatar file is required')
            }

            // Log the file details for debugging
            console.log('Avatar upload details:', {
                originalname: avatarFile.originalname,
                mimetype: avatarFile.mimetype,
                size: avatarFile.size,
                userId: req.user.uuid
            })

            const updatedUser = await this.userService.update(
                req.user.uuid,
                {},
                avatarFile
            )

            return {
                statusCode: HttpStatus.OK,
                message: 'Avatar updated successfully',
                data: updatedUser
            }
        } catch (error) {
            console.error('Avatar update error:', {
                error: error.message,
                userId: req.user.uuid,
                fileInfo: avatarFile
                    ? {
                          name: avatarFile.originalname,
                          type: avatarFile.mimetype,
                          size: avatarFile.size
                      }
                    : 'No file'
            })

            if (error.status) {
                throw error
            }

            throw new BadRequestException(
                error.message || 'Failed to update avatar'
            )
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
