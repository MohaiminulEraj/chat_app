import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { RoomType } from '../entities/room.entity';

export class CreateRoomDto {
  @IsUUID()
  groupId: string;

  @IsString()
  name: string;

  @IsEnum(RoomType)
  @IsOptional()
  type?: RoomType = RoomType.VOICE;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  maxSeats?: number = 10;

  @IsOptional()
  settings?: {
    quality?: 'low' | 'medium' | 'high';
    autoMute?: boolean;
    waitingRoom?: boolean;
  };
}
