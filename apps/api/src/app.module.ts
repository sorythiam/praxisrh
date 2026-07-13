import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './core/prisma/prisma.module';
import { AuthModule } from './core/auth/auth.module';
import { AuditModule } from './core/audit/audit.module';
import { NotificationsModule } from './core/notifications/notifications.module';
import { PayoutsModule } from './core/payouts/payouts.module';
import { RulesModule } from './core/rules/rules.module';
import { StorageModule } from './core/storage/storage.module';
import { BackofficeModule } from './core/backoffice/backoffice.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { TenantAlsMiddleware } from './core/tenancy/tenant-als.middleware';
import { TenantTransactionInterceptor } from './core/tenancy/tenant-transaction.interceptor';
import { JwtAuthGuard } from './core/auth/jwt-auth.guard';
import { RolesGuard } from './core/auth/roles.guard';
import { ModuleGuard } from './core/auth/module.guard';
import { EmployeesModule } from './rh/employees/employees.module';
import { PlanningModule } from './rh/planning/planning.module';
import { TimeclockModule } from './rh/timeclock/timeclock.module';
import { LeaveModule } from './rh/leave/leave.module';
import { PayrollModule } from './rh/payroll/payroll.module';
import { RhDashboardModule } from './rh/dashboard/dashboard.module';
import { IpmModule } from './ipm/ipm.module';
import { InterimModule } from './interim/interim.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    NotificationsModule,
    PayoutsModule,
    RulesModule,
    StorageModule,
    AuthModule,
    BackofficeModule,
    SubscriptionModule,
    EmployeesModule,
    PlanningModule,
    TimeclockModule,
    LeaveModule,
    PayrollModule,
    RhDashboardModule,
    IpmModule,
    InterimModule,
  ],
  providers: [
    // Order matters: JWT verification -> role check -> module-activation
    // check, all before the tenant transaction interceptor opens the
    // request's scoped Prisma client.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ModuleGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantTransactionInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantAlsMiddleware).forRoutes('*');
  }
}
