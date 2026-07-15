import { IsDateString, IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { ObjectiveType, FeedbackType } from '@prisma/client';

export class CreateObjectiveDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  teamName?: string;

  @IsEnum(ObjectiveType)
  type!: ObjectiveType;

  @IsString()
  title!: string;

  @IsString()
  periodLabel!: string;
}

export class UpdateObjectiveDto {
  @IsOptional()
  @IsIn(['ON_TRACK', 'AT_RISK', 'COMPLETED'])
  status?: 'ON_TRACK' | 'AT_RISK' | 'COMPLETED';
}

export class CreateKeyResultDto {
  @IsString()
  description!: string;

  @IsNumber()
  targetValue!: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class UpdateKeyResultDto {
  @IsNumber()
  currentValue!: number;
}

export class CreateFeedbackDto {
  @IsString()
  toEmployeeId!: string;

  @IsEnum(FeedbackType)
  type!: FeedbackType;

  @IsString()
  content!: string;
}

export class CreateReviewCycleDto {
  @IsString()
  periodLabel!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class UpsertReviewDto {
  @IsString()
  employeeId!: string;

  @IsOptional()
  @IsNumber()
  selfScore?: number;

  @IsOptional()
  @IsNumber()
  managerScore?: number;

  @IsOptional()
  @IsString()
  managerComments?: string;
}

export class CalibrateReviewDto {
  @IsNumber()
  calibratedScore!: number;
}
