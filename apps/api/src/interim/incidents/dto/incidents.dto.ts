import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InterimIncidentSeverity } from '@prisma/client';

export class ReportIncidentDto {
  @IsString()
  employeeId!: string;

  @IsOptional()
  @IsString()
  missionId?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(InterimIncidentSeverity)
  severity?: InterimIncidentSeverity;
}

export class BlacklistEmployeeDto {
  @IsString()
  employeeId!: string;

  @IsString()
  reason!: string;
}

export class LiftBlacklistDto {
  @IsOptional()
  @IsString()
  liftedReason?: string;
}
