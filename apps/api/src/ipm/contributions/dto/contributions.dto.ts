import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

const ASSIETTE_PLAFOND_FCFA = 250000;

export class GenerateContributionsDto {
  @IsInt()
  @Min(2020)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  // Real IPM rate tables can carry a decimal (e.g. 4.5%), so this
  // matches IpmContribution.ratePercent's Float column rather than
  // rounding rates down to whole percentages.
  @IsOptional()
  @IsNumber()
  @Min(4)
  @Max(15)
  ratePercent?: number;

  // The conventional employer/employee split (2/3 - 1/3) is 66.67%, not
  // an integer — this must accept decimals or the service's own default
  // fails its own DTO's validation.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  employerSharePercent?: number;
}

export { ASSIETTE_PLAFOND_FCFA };
