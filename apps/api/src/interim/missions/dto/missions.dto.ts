import { IsDateString, IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMissionDto {
  @IsString()
  clientName!: string;

  @IsOptional()
  @IsString()
  clientContactName?: string;

  @IsOptional()
  @IsEmail()
  clientContactEmail?: string;

  @IsOptional()
  @IsString()
  clientContactPhone?: string;

  @IsString()
  siteName!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsInt()
  @Min(0)
  billingRateFcfaPerHour!: number;

  @IsInt()
  @Min(0)
  payRateFcfaPerHour!: number;
}

export class CreateAssignmentDto {
  @IsString()
  employeeId!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
