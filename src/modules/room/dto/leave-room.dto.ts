import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsUUID } from 'class-validator'

export class LeaveRoomDto {
    @ApiProperty({
        description: 'Room ID to leave',
        example: '123e4567-e89b-12d3-a456-426614174001',
        required: true
    })
    @IsString()
    @IsUUID()
    roomId: string
}
