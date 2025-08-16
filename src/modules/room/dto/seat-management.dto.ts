import { ApiProperty } from '@nestjs/swagger'
import {
    IsBoolean,
    IsNumber,
    IsOptional,
    IsUUID,
    Max,
    Min
} from 'class-validator'

export class JoinRoomWithSeatDto {
    @ApiProperty({
        description: 'Password for private rooms',
        example: 'mySecretPassword',
        required: false
    })
    @IsOptional()
    @IsUUID()
    password?: string

    @ApiProperty({
        description:
            'Preferred seat number (0-based index). If not specified, auto-assigns next available seat.',
        example: 2,
        required: false,
        minimum: 0,
        maximum: 9
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(9)
    seatNumber?: number
}

export class ToggleSeatLockDto {
    @ApiProperty({
        description: 'Room UUID',
        example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
    })
    @IsUUID()
    roomId: string

    @ApiProperty({
        description: 'Seat index to lock/unlock (0-based)',
        example: 3,
        minimum: 0,
        maximum: 9
    })
    @IsNumber()
    @Min(0)
    @Max(9)
    seatIndex: number

    @ApiProperty({
        description: 'Whether to lock (true) or unlock (false) the seat',
        example: true
    })
    @IsBoolean()
    isLocked: boolean
}

export class RequestSeatDto {
    @ApiProperty({
        description: 'Room UUID',
        example: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
    })
    @IsUUID()
    roomId: string

    @ApiProperty({
        description:
            'Requested seat index (0-based). Leave empty for auto-assignment.',
        example: 2,
        required: false,
        minimum: 1,
        maximum: 9
    })
    @IsOptional()
    @IsNumber()
    @Min(1) // Seat 0 is reserved for host
    @Max(9)
    seatIndex?: number
}
