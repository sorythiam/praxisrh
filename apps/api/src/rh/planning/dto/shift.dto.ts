import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';

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
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateShiftDto)
  shifts!: CreateShiftDto[];
}

export class PublishShiftsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  shiftIds!: string[];
}
