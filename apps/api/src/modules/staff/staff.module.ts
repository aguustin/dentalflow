import { Module } from '@nestjs/common';
import { RESOURCE_REPOSITORY_TOKEN, STAFF_REPOSITORY_TOKEN } from './staff.tokens';
import { ResourcePrismaRepository, StaffPrismaRepository } from './infrastructure/staff.prisma.repository';
import { ResourcesService, StaffService } from './application/staff.service';
import { ResourcesController, StaffController } from './api/staff.controller';

/** Staff members, their weekly working hours and time off, and bookable resources. */
@Module({
  controllers: [StaffController, ResourcesController],
  providers: [
    { provide: STAFF_REPOSITORY_TOKEN, useClass: StaffPrismaRepository },
    { provide: RESOURCE_REPOSITORY_TOKEN, useClass: ResourcePrismaRepository },
    StaffService,
    ResourcesService,
  ],
})
export class StaffModule {}
