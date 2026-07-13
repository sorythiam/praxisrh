import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '@praxis/shared';

export class InviteUserDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(Role)
  role!: Role;
}
