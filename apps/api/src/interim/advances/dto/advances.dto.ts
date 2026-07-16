import { IsBoolean, IsInt, Min } from 'class-validator';

export class RequestAdvanceDto {
  @IsInt()
  @Min(1)
  amountFcfa!: number;
}

export class DecideAdvanceDto {
  @IsBoolean()
  approve!: boolean;
}
