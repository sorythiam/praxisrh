import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { IpmDependentRelationship } from '@prisma/client';

export class ActivateBeneficiaryDto {
  @IsString()
  employeeId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  coverageRatePercent?: number;
}

export class AddDependentDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsEnum(IpmDependentRelationship)
  relationship!: IpmDependentRelationship;
}

export class SuspendBeneficiaryDto {
  @IsString()
  reason!: string;
}
