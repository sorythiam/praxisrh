import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { LeaveType } from '@praxis/shared';

export class CreateLeaveRequestDto {
  @IsEnum(LeaveType)
  type!: LeaveType;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class DecisionDto {
  @IsBoolean()
  approve!: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
