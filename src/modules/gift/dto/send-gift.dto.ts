import { IsOptional, IsString, IsUUID } from 'class-validator'

export class SendGiftDto {
    @IsUUID()
    giftId: string

    @IsUUID()
    receiverId: string

    @IsUUID()
    @IsOptional()
    roomId?: string

    @IsString()
    @IsOptional()
    message?: string
}
