import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SuccessionReadiness } from '@prisma/client';

export class CreateCompetenceDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class SetEmployeeCompetenceDto {
  @IsString()
  competenceId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  level!: number;
}

export class SetEmployeeCompetencesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SetEmployeeCompetenceDto)
  entries!: SetEmployeeCompetenceDto[];
}

export class PosteRequirementDto {
  @IsString()
  competenceId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  requiredLevel!: number;
}

export class CreatePosteInterneDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsBoolean()
  isKeyRole?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosteRequirementDto)
  requirements!: PosteRequirementDto[];
}

export class ApplyToPosteDto {
  @IsOptional()
  @IsString()
  message?: string;
}

export class DecideApplicationDto {
  @IsIn(['EN_EVALUATION', 'RETENU', 'REJETE'])
  status!: 'EN_EVALUATION' | 'RETENU' | 'REJETE';
}

export class UpsertDevelopmentPlanDto {
  @IsString()
  goals!: string;

  @IsOptional()
  @IsString()
  targetPosteInterneId?: string;

  @IsOptional()
  @IsArray()
  recommendedActions?: Array<{ label: string; type?: string }>;
}

export class CreateSuccessionPlanDto {
  @IsOptional()
  @IsString()
  currentHolderEmployeeId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddSuccessionCandidateDto {
  @IsString()
  employeeId!: string;

  @IsEnum(SuccessionReadiness)
  readiness!: SuccessionReadiness;

  @IsOptional()
  @IsString()
  notes?: string;
}
