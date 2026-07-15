import { IsInt, IsOptional, Max, Min } from 'class-validator';

const ASSIETTE_PLAFOND_FCFA = 250000;

export class GenerateContributionsDto {
  @IsInt()
  @Min(2020)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(15)
  ratePercent?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  employerSharePercent?: number;
}

export { ASSIETTE_PLAFOND_FCFA };
