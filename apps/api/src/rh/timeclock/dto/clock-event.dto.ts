import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ClockEventType } from '@praxis/shared';

export class ClockEventInputDto {
  @IsString()
  clientEventId!: string;

  @IsEnum(ClockEventType)
  type!: ClockEventType;

  @IsDateString()
  timestamp!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class SyncClockEventsDto {
  events!: ClockEventInputDto[];
}
