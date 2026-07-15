import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { IpmCaseStatus } from '@prisma/client';
import { ModuleCode, Role } from '@praxis/shared';
import { JwtAuthGuard } from '../../core/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuleGuard } from '../../core/auth/module.guard';
import { Roles } from '../../core/auth/roles.decorator';
import { RequireModule } from '../../core/auth/require-module.decorator';
import { ReimbursementsService } from './reimbursements.service';
import { DecideReimbursementDto, SetAnnualCapDto, SubmitReimbursementDto } from './dto/reimbursements.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@RequireModule(ModuleCode.IPM)
@Controller('ipm/reimbursements')
export class ReimbursementsController {
  constructor(private reimbursementsService: ReimbursementsService) {}

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Post('me')
  submitMyCase(@Body() dto: SubmitReimbursementDto) {
    return this.reimbursementsService.submitMyCase(dto);
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER)
  @Get('me')
  myCases() {
    return this.reimbursementsService.getMyCases();
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.reimbursementsService.uploadDocument(id, file.originalname, file.buffer);
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get(':id/documents/download')
  async downloadDocument(@Param('id') id: string, @Query('path') path: string, @Res() res: Response) {
    const reimbursementCase = await this.reimbursementsService.getCase(id);
    const documentUrls: string[] = Array.isArray(reimbursementCase.documentUrls) ? reimbursementCase.documentUrls : [];
    if (!documentUrls.includes(path)) {
      res.status(404).send('Document introuvable pour ce dossier.');
      return;
    }
    const content = await this.reimbursementsService.downloadDocument(path);
    res.send(content);
  }

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get()
  listCases(@Query('status') status?: IpmCaseStatus) {
    return this.reimbursementsService.listCases({ status });
  }

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get('beneficiaries/:beneficiaryId/history')
  getBeneficiaryHistory(@Param('beneficiaryId') beneficiaryId: string) {
    return this.reimbursementsService.getBeneficiaryHistory(beneficiaryId);
  }

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get('caps')
  listAnnualCaps() {
    return this.reimbursementsService.listAnnualCaps();
  }

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post('caps')
  setAnnualCap(@Body() dto: SetAnnualCapDto) {
    return this.reimbursementsService.setAnnualCap(dto);
  }

  @Roles(Role.EMPLOYEE, Role.MANAGER, Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Get(':id')
  getCase(@Param('id') id: string) {
    return this.reimbursementsService.getCase(id);
  }

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch(':id/gestionnaire-decision')
  gestionnaireDecision(@Param('id') id: string, @Body() dto: DecideReimbursementDto) {
    return this.reimbursementsService.gestionnaireDecision(id, dto);
  }

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Patch(':id/medical-review')
  medicalReview(@Param('id') id: string, @Body() dto: DecideReimbursementDto) {
    return this.reimbursementsService.medicalReview(id, dto);
  }

  @Roles(Role.IPM_MANAGER, Role.HR_ADMIN, Role.COMPANY_ADMIN)
  @Post(':id/pay')
  pay(@Param('id') id: string, @Body() body: { provider?: any }) {
    return this.reimbursementsService.pay(id, body?.provider);
  }
}
