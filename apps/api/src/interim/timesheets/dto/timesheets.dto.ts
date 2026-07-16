import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubmitTimesheetDto {
  @IsString()
  assignmentId!: string;

  @IsDateString()
  date!: string;

  @IsNumber()
  @Min(0)
  hours!: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  // Scanned from the physical QR code posted at the client site; compared
  // server-side against InterimMission.siteQrToken (9.2).
  @IsOptional()
  @IsString()
  siteQrToken?: string;
}

export class ClientValidationDecisionDto {
  @IsString()
  validatedByName!: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
