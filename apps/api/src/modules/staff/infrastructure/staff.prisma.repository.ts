import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IResourceRepository, IStaffRepository, StaffWriteData } from '../domain/staff.repository.interface';
import { ResourceData, StaffData, TimeOffData, WorkingHoursRange } from '../domain/staff.types';

const withHours = {
  workingHours: { orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }] },
} satisfies Prisma.StaffMemberInclude;

type StaffRow = Prisma.StaffMemberGetPayload<{ include: typeof withHours }>;

function toStaff(row: StaffRow): StaffData {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    name: row.name,
    specialty: row.specialty,
    color: row.color,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    workingHours: row.workingHours.map(({ weekday, startMinute, endMinute }) => ({
      weekday,
      startMinute,
      endMinute,
    })),
  };
}

@Injectable()
export class StaffPrismaRepository implements IStaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, includeInactive: boolean): Promise<StaffData[]> {
    const rows = await this.prisma.staffMember.findMany({
      where: { organizationId, ...(!includeInactive && { isActive: true }) },
      include: withHours,
      orderBy: { name: 'asc' },
    });
    return rows.map(toStaff);
  }

  async findById(id: string, organizationId: string): Promise<StaffData | null> {
    const row = await this.prisma.staffMember.findFirst({
      where: { id, organizationId },
      include: withHours,
    });
    return row ? toStaff(row) : null;
  }

  async create(organizationId: string, data: StaffWriteData): Promise<StaffData> {
    const row = await this.prisma.staffMember.create({
      data: { organizationId, ...data },
      include: withHours,
    });
    return toStaff(row);
  }

  async update(id: string, data: Partial<StaffWriteData>): Promise<StaffData> {
    const row = await this.prisma.staffMember.update({ where: { id }, data, include: withHours });
    return toStaff(row);
  }

  async replaceWorkingHours(staffId: string, ranges: WorkingHoursRange[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.workingHours.deleteMany({ where: { staffId } }),
      this.prisma.workingHours.createMany({ data: ranges.map((r) => ({ staffId, ...r })) }),
    ]);
  }

  async findUpcomingTimeOff(staffId: string, from: Date): Promise<TimeOffData[]> {
    return this.prisma.timeOff.findMany({
      where: { staffId, endTime: { gt: from } },
      orderBy: { startTime: 'asc' },
      select: { id: true, startTime: true, endTime: true, reason: true },
    });
  }

  async addTimeOff(staffId: string, data: Omit<TimeOffData, 'id'>): Promise<TimeOffData> {
    return this.prisma.timeOff.create({
      data: { staffId, ...data },
      select: { id: true, startTime: true, endTime: true, reason: true },
    });
  }

  async deleteTimeOff(staffId: string, timeOffId: string): Promise<boolean> {
    const { count } = await this.prisma.timeOff.deleteMany({ where: { id: timeOffId, staffId } });
    return count > 0;
  }
}

@Injectable()
export class ResourcePrismaRepository implements IResourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly select = { id: true, organizationId: true, name: true, isActive: true };

  findAll(organizationId: string, includeInactive: boolean): Promise<ResourceData[]> {
    return this.prisma.resource.findMany({
      where: { organizationId, ...(!includeInactive && { isActive: true }) },
      orderBy: { name: 'asc' },
      select: ResourcePrismaRepository.select,
    });
  }

  findById(id: string, organizationId: string): Promise<ResourceData | null> {
    return this.prisma.resource.findFirst({
      where: { id, organizationId },
      select: ResourcePrismaRepository.select,
    });
  }

  create(organizationId: string, name: string): Promise<ResourceData> {
    return this.prisma.resource.create({
      data: { organizationId, name },
      select: ResourcePrismaRepository.select,
    });
  }

  update(id: string, data: { name?: string; isActive?: boolean }): Promise<ResourceData> {
    return this.prisma.resource.update({ where: { id }, data, select: ResourcePrismaRepository.select });
  }
}
