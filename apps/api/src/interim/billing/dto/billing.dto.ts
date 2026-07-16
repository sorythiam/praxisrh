import { IsDateString, IsString } from 'class-validator';

export class GenerateProformaDto {
  @IsString()
  missionId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;
}
