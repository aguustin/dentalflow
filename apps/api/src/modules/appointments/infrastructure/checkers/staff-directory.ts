import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IStaffDirectory } from '../../application/services/staff-directory.interface';
import { Interval, WeeklyRange } from '../../domain/services/availability';

@Injectable()
export class PrismaStaffDirectory implements IStaffDirectory {
  constructor(private readonly prisma: PrismaService) {}

  async isActiveStaff(staffId: string, organizationId: string): Promise<boolean> {
    return (await this.prisma.staffMember.count({ where: { id: staffId, organizationId, isActive: true } })) > 0;
  }

  async isActiveResource(resourceId: string, organizationId: string): Promise<boolean> {
    return (
      (await this.prisma.resource.count({ where: { id: resourceId, organizationId, isActive: true } })) > 0
    );
  }

  async getSchedule(
    staffId: string,
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<{ workingHours: WeeklyRange[]; timeOff: Interval[] } | null> {
    const staff = await this.prisma.staffMember.findFirst({
      where: { id: staffId, organizationId, isActive: true },
      select: {
        workingHours: { select: { weekday: true, startMinute: true, endMinute: true } },
        timeOff: {
          where: { startTime: { lt: to }, endTime: { gt: from } },
          select: { startTime: true, endTime: true },
        },
      },
    });
    if (!staff) return null;
    return {
      workingHours: staff.workingHours,
      timeOff: staff.timeOff.map((t) => ({ start: t.startTime, end: t.endTime })),
    };
  }

  async findStaffInfo(
    staffIds: string[],
    organizationId: string,
  ): Promise<Map<string, { name: string; color: string }>> {
    if (staffIds.length === 0) return new Map();
    const rows = await this.prisma.staffMember.findMany({
      where: { id: { in: [...new Set(staffIds)] }, organizationId },
      select: { id: true, name: true, color: true },
    });
    return new Map(rows.map((r) => [r.id, { name: r.name, color: r.color }]));
  }
}
