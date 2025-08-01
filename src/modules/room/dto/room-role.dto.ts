import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsUUID } from 'class-validator'
import { RoomRole } from '../entities/room-role.entity'

export class AssignRoomRoleDto {
    @ApiProperty({
        description: 'The UUID of the user to assign the role to',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsUUID()
    userId: string

    @ApiProperty({
        description: 'The role to assign to the user',
        enum: RoomRole,
        example: RoomRole.SPEAKER
    })
    @IsEnum(RoomRole)
    role: RoomRole
}

export class TransferOwnershipDto {
    @ApiProperty({
        description: 'The UUID of the user to transfer ownership to',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsUUID()
    newOwnerId: string
}
