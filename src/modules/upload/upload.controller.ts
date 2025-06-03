import {
    BadRequestException,
    Controller,
    Delete,
    HttpStatus,
    Param,
    Post,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors
} from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UploadService } from './upload.service'

@ApiTags('📤 Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
    constructor(private readonly uploadService: UploadService) {}

    @Post('image')
    @ApiOperation({ summary: 'Upload a single image' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Image uploaded successfully'
    })
    @UseInterceptors(
        FileInterceptor('file', {
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                    return cb(
                        new BadRequestException('Only image files are allowed'),
                        false
                    )
                }
                cb(null, true)
            }
        })
    )
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded')
        }

        const result = await this.uploadService.uploadImage(file)
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Image uploaded successfully',
            data: result
        }
    }

    @Post('images')
    @ApiOperation({ summary: 'Upload multiple images' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary'
                    }
                }
            }
        }
    })
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                    return cb(
                        new BadRequestException('Only image files are allowed'),
                        false
                    )
                }
                cb(null, true)
            }
        })
    )
    async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files uploaded')
        }

        const results = await this.uploadService.uploadMultipleImages(files)
        return {
            statusCode: HttpStatus.CREATED,
            message: 'Images uploaded successfully',
            data: results
        }
    }

    @Post('file')
    @ApiOperation({ summary: 'Upload any file' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded')
        }

        const result = await this.uploadService.uploadFile(file)
        return {
            statusCode: HttpStatus.CREATED,
            message: 'File uploaded successfully',
            data: result
        }
    }

    @Delete(':publicId')
    @ApiOperation({ summary: 'Delete a file from Cloudinary' })
    @ApiParam({
        name: 'publicId',
        description: 'Cloudinary public ID of the file'
    })
    async deleteFile(@Param('publicId') publicId: string) {
        await this.uploadService.deleteFile(publicId)
        return {
            statusCode: HttpStatus.OK,
            message: 'File deleted successfully'
        }
    }
}
