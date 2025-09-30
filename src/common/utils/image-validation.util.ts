import { BadRequestException } from '@nestjs/common'

/**
 * Comprehensive list of supported image MIME types
 * Includes all common image formats for maximum compatibility
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
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

/**
 * User-friendly list of supported image formats for error messages
 */
export const SUPPORTED_IMAGE_FORMATS =
    'JPEG/JPG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO, JFIF'

/**
 * Validates if the provided MIME type is a supported image format
 * @param mimetype The MIME type to validate
 * @returns boolean indicating if the MIME type is supported
 */
export function isValidImageMimeType(mimetype: string): boolean {
    return ALLOWED_IMAGE_MIME_TYPES.includes(mimetype)
}

/**
 * Validates image file and throws BadRequestException if invalid
 * @param file The Express.Multer.File to validate
 * @param maxSizeBytes Maximum file size in bytes (default: 10MB)
 * @throws BadRequestException if file is invalid
 */
export function validateImageFile(
    file: Express.Multer.File,
    maxSizeBytes: number = 10 * 1024 * 1024
): void {
    if (!file) {
        throw new BadRequestException('No file provided')
    }

    // Validate MIME type
    if (!isValidImageMimeType(file.mimetype)) {
        throw new BadRequestException(
            `Unsupported image format: ${file.mimetype}. Supported formats: ${SUPPORTED_IMAGE_FORMATS}`
        )
    }

    // Validate file size
    if (file.size > maxSizeBytes) {
        const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024))
        throw new BadRequestException(
            `File size too large. Maximum size allowed is ${maxSizeMB}MB`
        )
    }
}

/**
 * Multer file filter function for image uploads
 * @param maxSizeBytes Maximum file size in bytes (default: 10MB)
 * @returns Multer file filter function
 */
export function createImageFileFilter(maxSizeBytes: number = 10 * 1024 * 1024) {
    return (req: any, file: Express.Multer.File, cb: any) => {
        try {
            // Only validate MIME type here, size is handled by multer limits
            if (!isValidImageMimeType(file.mimetype)) {
                return cb(
                    new BadRequestException(
                        `Unsupported image format: ${file.mimetype}. Supported formats: ${SUPPORTED_IMAGE_FORMATS}`
                    ),
                    false
                )
            }
            cb(null, true)
        } catch (error) {
            cb(error, false)
        }
    }
}

/**
 * Common multer options for image uploads
 * @param maxSizeBytes Maximum file size in bytes (default: 10MB)
 * @returns Multer options object
 */
export function getImageUploadOptions(maxSizeBytes: number = 10 * 1024 * 1024) {
    return {
        fileFilter: createImageFileFilter(maxSizeBytes),
        limits: {
            fileSize: maxSizeBytes
        }
    }
}
