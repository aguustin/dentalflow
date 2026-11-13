import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { appConfig } from './config/app.config';
import { jwtConfig } from './config/jwt.config';

import { PrismaModule } from './infrastructure/database/prisma.module';
import { EventBusModule } from './infrastructure/event-bus/event-bus.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { RepositoriesModule } from './infrastructure/repositories/repositories.module';

import { AuthModule } from './modules/core/auth/auth.module';
import { UsersModule } from './modules/core/users/users.module';
import { OrganizationsModule } from './modules/core/organizations/organizations.module';
import { RolesModule } from './modules/core/roles/roles.module';
import { PermissionsModule } from './modules/core/permissions/permissions.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { StaffModule } from './modules/staff/staff.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { SalesModule } from './modules/sales/sales.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { BillingModule } from './modules/billing/billing.module';
import { OrganizationOnboardingModule } from './modules/organizations/organizations.module';

import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { PermissionsGuard } from './shared/guards/permissions.guard';
import { ModuleGuard } from './shared/guards/module.guard';
import { AuditInterceptor } from './shared/interceptors/audit.interceptor';
import { DomainExceptionFilter } from './shared/filters/domain-exception.filter';
import { RequestIdMiddleware } from './shared/middleware/request-id.middleware';
import { TenantResolutionMiddleware } from './shared/middleware/tenant-resolution.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig, jwtConfig],
    }),
    // Global rate limiter — auth endpoints override with stricter @Throttle() limits
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,  // 1 minute window
        limit: 120,  // 120 req/min globally
      },
    ]),
    PrismaModule,
    EventBusModule,
    LoggerModule,
    RepositoriesModule,
    // OrganizationOnboardingModule must come before core OrganizationsModule so that
    // POST /organizations registers the full onboarding flow as the primary handler.
    OrganizationOnboardingModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    RolesModule,
    PermissionsModule,
    CustomersModule,
    AppointmentsModule,
    StaffModule,
    CatalogModule,
    SalesModule,
    InventoryModule,
    BillingModule,
  ],
  providers: [
    // Exception filters run in reverse registration order — DomainExceptionFilter
    // must be registered first so it fires last (innermost filter catches first).
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ModuleGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, TenantResolutionMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
