import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class AddTariffDto {
  @IsString()
  actCode!: string;

  @IsString()
  actLabel!: string;

  @IsInt()
  @Min(0)
  tariffFcfa!: number;
}
