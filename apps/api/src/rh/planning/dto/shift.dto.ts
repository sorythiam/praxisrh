import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateShiftDto {
  @IsString()
  employeeId!: string;

  @IsOptional()
  @IsString()
  establishmentId?: string;

  @IsDateString()
  date!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;
}

export class BulkCreateShiftsDto {
  shifts!: CreateShiftDto[];
}

export class PublishShiftsDto {
  shiftIds!: string[];
}
