import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
    UploadApiErrorResponse,
    UploadApiResponse,
    v2 as cloudinaryV2
} from 'cloudinary'
import * as streamifier from 'streamifier'

export interface CloudinaryResponse {
    public_id: string
    url: string
    secure_url: string
    format: string
    width: number
    height: number
    bytes: number
}

@Injectable()
export class CloudinaryService {
    private folder: string
    private readonly logger = new Logger(CloudinaryService.name)

    constructor(
        @Inject('CLOUDINARY') private cloudinary: typeof cloudinaryV2,
        private configService: ConfigService
    ) {
        this.folder = this.configService.get('CLOUDINARY_FOLDER', 'kitty')
    }

    async uploadImage(
        file: Express.Multer.File,
        options?: {
            folder?: string
            public_id?: string
            transformation?: any
        }
    ): Promise<CloudinaryResponse> {
        return new Promise((resolve, reject) => {
            const uploadOptions = {
                folder: options?.folder || this.folder,
                public_id: options?.public_id,
                transformation: options?.transformation,
                resource_type: 'image' as const
            }

            const uploadStream = this.cloudinary.uploader.upload_stream(
                uploadOptions,
                (err, result) => {
                    if (err) {
                        return reject(
                            new BadRequestException(
                                `Failed to upload image: ${err.message}`
                            )
                        )
                    }
                    resolve({
                        public_id: result.public_id,
                        url: result.url,
                        secure_url: result.secure_url,
                        format: result.format,
                        width: result.width,
                        height: result.height,
                        bytes: result.bytes
                    })
                }
            )

            streamifier.createReadStream(file.buffer).pipe(uploadStream)
        })
    }

    async uploadFile(
        file: Express.Multer.File,
        options?: {
            folder?: string
            public_id?: string
            resource_type?: 'image' | 'video' | 'raw' | 'auto'
        }
    ): Promise<CloudinaryResponse> {
        return new Promise((resolve, reject) => {
            const uploadOptions = {
                folder: options?.folder || this.folder,
                public_id: options?.public_id,
                resource_type: options?.resource_type || ('auto' as const)
            }

            const uploadStream = this.cloudinary.uploader.upload_stream(
                uploadOptions,
                (error: UploadApiErrorResponse, result: UploadApiResponse) => {
                    if (error) {
                        reject(
                            new BadRequestException(
                                `Failed to upload file: ${error.message}`
                            )
                        )
                    }
                    resolve({
                        public_id: result.public_id,
                        url: result.url,
                        secure_url: result.secure_url,
                        format: result.format,
                        width: result.width,
                        height: result.height,
                        bytes: result.bytes
                    })
                }
            )

            streamifier.createReadStream(file.buffer).pipe(uploadStream)
        })
    }

    async deleteFile(publicId: string): Promise<void> {
        try {
            await this.cloudinary.uploader.destroy(publicId)
        } catch (error) {
            throw new BadRequestException(
                `Failed to delete file: ${error.message}`
            )
        }
    }

    async deleteFiles(publicIds: string[]): Promise<void> {
        try {
            await this.cloudinary.api.delete_resources(publicIds)
        } catch (error) {
            throw new BadRequestException(
                `Failed to delete files: ${error.message}`
            )
        }
    }

    generateOptimizedUrl(publicId: string, options?: any): string {
        const defaultOptions = {
            fetch_format: 'auto',
            quality: 'auto',
            ...options
        }

        return this.cloudinary.url(publicId, defaultOptions)
    }

    generateThumbnailUrl(publicId: string, width = 200, height = 200): string {
        return this.cloudinary.url(publicId, {
            width,
            height,
            crop: 'thumb',
            gravity: 'face',
            fetch_format: 'auto',
            quality: 'auto'
        })
    }
}
