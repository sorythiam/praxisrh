import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { Role } from '@praxis/shared';
import { JwtAuthGuard } from '../core/auth/jwt-auth.guard';
import { RolesGuard } from '../core/auth/roles.guard';
import { Roles } from '../core/auth/roles.decorator';
import { TenantPrismaService } from '../core/prisma/tenant-prisma.service';

class UpsertEstablishmentDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('establishments')
export class EstablishmentsController {
  constructor(private tenantPrisma: TenantPrismaService) {}

  @Get()
  list() {
    return (this.tenantPrisma.client as any).establishment.findMany({ orderBy: { name: 'asc' } });
  }

  @Roles(Role.COMPANY_ADMIN, Role.HR_ADMIN)
  @Post()
  create(@Body() dto: UpsertEstablishmentDto) {
    return (this.tenantPrisma.client as any).establishment.create({ data: dto });
  }

  @Roles(Role.COMPANY_ADMIN, Role.HR_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertEstablishmentDto>) {
    return (this.tenantPrisma.client as any).establishment.update({ where: { id }, data: dto });
  }
}
