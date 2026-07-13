import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PayoutProvider } from '@praxis/shared';

export class GeneratePayrollDto {
  @IsInt()
  @Min(2020)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class GrantAdvanceDto {
  @IsString()
  employeeId!: string;

  @IsInt()
  @Min(1)
  amountFcfa!: number;
}

export class PayReportDto {
  @IsOptional()
  provider?: PayoutProvider;
}
