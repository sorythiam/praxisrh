import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Public } from '../../core/auth/public.decorator';
import { TimesheetsService } from './timesheets.service';
import { ClientValidationDecisionDto } from './dto/timesheets.dto';

/**
 * "Extranet validation client" (9.3) with no client login: the token
 * minted at submission (see TimesheetsService.submitMyTimesheet) is the
 * only credential. @Public() skips the global JwtAuthGuard; RolesGuard
 * and ModuleGuard both no-op with no @Roles/@RequireModule metadata, and
 * TenantTransactionInterceptor skips opening a tenant transaction since
 * there is no authenticated tenant in context — the service reaches the
 * row directly via the sanctioned RLS-bypass path instead.
 */
@Public()
@Controller('interim/client-validation')
export class ClientValidationController {
  constructor(private timesheetsService: TimesheetsService) {}

  @Get(':token')
  get(@Param('token') token: string) {
    return this.timesheetsService.getByToken(token);
  }

  @Post(':token/approve')
  approve(@Param('token') token: string, @Body() dto: ClientValidationDecisionDto) {
    return this.timesheetsService.decideByToken(token, true, dto);
  }

  @Post(':token/reject')
  reject(@Param('token') token: string, @Body() dto: ClientValidationDecisionDto) {
    return this.timesheetsService.decideByToken(token, false, dto);
  }
}
