import { Injectable } from '@nestjs/common'
import {
    CloudinaryResponse,
    CloudinaryService
} from '../cloudinary/cloudinary.service'

@Injectable()
export class UploadService {
    constructor(private cloudinaryService: CloudinaryService) {}

    async uploadImage(
        file: Express.Multer.File,
        folder?: string
    ): Promise<CloudinaryResponse> {
        return this.cloudinaryService.uploadImage(file, { folder })
    }

    async uploadFile(
        file: Express.Multer.File,
        folder?: string
    ): Promise<CloudinaryResponse> {
        return this.cloudinaryService.uploadFile(file, { folder })
    }

    async deleteFile(publicId: string): Promise<void> {
        return this.cloudinaryService.deleteFile(publicId)
    }

    async uploadMultipleImages(
        files: Express.Multer.File[],
        folder?: string
    ): Promise<CloudinaryResponse[]> {
        const uploadPromises = files.map((file) =>
            this.uploadImage(file, folder)
        )
        return Promise.all(uploadPromises)
    }
}
