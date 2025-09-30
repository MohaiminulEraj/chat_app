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
                // Support for all common image formats
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
                // Support for all common image formats
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
