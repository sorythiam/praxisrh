import { ArrayMinSize, IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ModuleCode } from '@praxis/shared';

export class SubscribeDto {
  @IsString()
  companyName!: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsString()
  adminFirstName!: string;

  @IsString()
  adminLastName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsOptional()
  @IsString()
  adminPhone?: string;

  @MinLength(8)
  password!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ModuleCode, { each: true })
  modules!: ModuleCode[];
}
