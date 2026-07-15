import { IsDateString, IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ContractType, EmploymentCategory } from '@praxis/shared';

export class CreateJobPostingDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  establishmentId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateApplicationDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  resumeUrl?: string;
}

export class UpdateApplicationStageDto {
  @IsIn(['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'])
  stage!: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
}

/**
 * Deliberately does NOT repeat firstName/lastName/email/phone — those
 * come from the Candidate record already on file, per the spec's
 * acceptance criteria for section 6.14 ("le dossier candidat devient le
 * dossier employé sans aucune ressaisie").
 */
export class HireApplicationDto {
  @IsString()
  employeeNumber!: string;

  @IsString()
  position!: string;

  @IsEnum(EmploymentCategory)
  employmentCategory!: EmploymentCategory;

  @IsDateString()
  hireDate!: string;

  @IsEnum(ContractType)
  contractType!: ContractType;

  @IsInt()
  @Min(0)
  baseSalaryFcfa!: number;

  @IsOptional()
  @IsString()
  establishmentId?: string;
}
