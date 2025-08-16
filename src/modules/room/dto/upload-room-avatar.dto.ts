import { ApiProperty } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

export class UploadRoomAvatarDto {
    @ApiProperty({
        description: 'The UUID of the room to update avatar for',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsUUID()
    roomId: string

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description:
            'Room avatar image file (JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO supported, max 10MB)'
    })
    file: Express.Multer.File
}
