import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ContractType, EmploymentCategory } from '@praxis/shared';

export class CreateEmployeeDto {
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
  nationalId?: string;

  @IsOptional()
  @IsString()
  mobileMoneyProvider?: string;

  @IsOptional()
  @IsString()
  mobileMoneyNumber?: string;

  @IsString()
  employeeNumber!: string;

  @IsString()
  position!: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  establishmentId?: string;

  @IsEnum(EmploymentCategory)
  employmentCategory!: EmploymentCategory;

  @IsDateString()
  hireDate!: string;

  @IsEnum(ContractType)
  contractType!: ContractType;

  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @IsInt()
  @Min(0)
  baseSalaryFcfa!: number;

  @IsOptional()
  @IsInt()
  weeklyHours?: number;

  @IsOptional()
  @IsString()
  createLoginWithPassword?: string;
}
