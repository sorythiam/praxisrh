import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { IpmCapCategory } from '@prisma/client';

export class SubmitReimbursementDto {
  @IsEnum(IpmCapCategory)
  category!: IpmCapCategory;

  @IsString()
  invoiceNumber!: string;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsInt()
  @Min(1)
  amountClaimedFcfa!: number;

  @IsOptional()
  @IsString()
  dependentId?: string;

  @IsOptional()
  @IsDateString()
  justifiesAbsenceFrom?: string;

  @IsOptional()
  @IsDateString()
  justifiesAbsenceTo?: string;
}

export class DecideReimbursementDto {
  @IsBoolean()
  approve!: boolean;

  @IsOptional()
  @IsString()
  rejectionReasonCode?: string;
}

export class SetAnnualCapDto {
  @IsEnum(IpmCapCategory)
  category!: IpmCapCategory;

  @IsInt()
  @Min(0)
  annualCapFcfa!: number;
}
