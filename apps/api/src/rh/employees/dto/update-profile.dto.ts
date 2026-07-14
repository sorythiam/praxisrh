import { IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * "Mise à jour de ses informations personnelles (coordonnées, compte
 * mobile money)" — section 6.10. Deliberately narrow: an employee can
 * change how to reach/pay them, never their name, position, salary or
 * employment status — those stay HR-only (EmployeesService.update).
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  mobileMoneyProvider?: string;

  @IsOptional()
  @IsString()
  mobileMoneyNumber?: string;
}
