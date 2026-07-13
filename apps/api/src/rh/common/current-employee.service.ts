import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../core/prisma/tenant-prisma.service';
import { getCurrentUserId } from '../../core/tenancy/tenant-context';

/**
 * Resolves the Employee record behind the currently authenticated User,
 * for all "my own data" self-service endpoints (planning, leave,
 * timeclock, payslips). An EMPLOYEE or MANAGER never passes an
 * employeeId in these routes — it is always derived server-side from the
 * JWT, so there is no way to request someone else's data by tampering
 * with a request body.
 */
@Injectable()
export class CurrentEmployeeService {
  constructor(private tenantPrisma: TenantPrismaService) {}

  async resolve() {
    const userId = getCurrentUserId();
    const user = await (this.tenantPrisma.client as any).user.findUnique({ where: { id: userId } });
    if (!user?.personId) {
      throw new BadRequestException("Ce compte n'est rattaché à aucun dossier employé.");
    }
    const employee = await (this.tenantPrisma.client as any).employee.findFirst({
      where: { personId: user.personId },
      include: { person: true },
    });
    if (!employee) {
      throw new BadRequestException("Aucun dossier employé associé à ce compte.");
    }
    return employee;
  }

  async managedEmployeeIds(managerUserId: string): Promise<string[]> {
    const employees = await (this.tenantPrisma.client as any).employee.findMany({
      where: { managerUserId },
      select: { id: true },
    });
    return employees.map((e: any) => e.id);
  }
}
