import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IMembershipRepository } from '../../../domain/repositories/membership.repository.interface';
import { TOKENS } from '../../../shared/injection-tokens';
import { IResourceRepository, IStaffRepository, StaffWriteData } from '../domain/staff.repository.interface';
import { normalizeWorkingHours, ResourceData, StaffData, TimeOffData, WorkingHoursRange } from '../domain/staff.types';
import { RESOURCE_REPOSITORY_TOKEN, STAFF_REPOSITORY_TOKEN } from '../staff.tokens';

export type StaffDetail = StaffData & { upcomingTimeOff: TimeOffData[] };

/**
 * Application service for staff members and their schedules.
 * Mostly CRUD, so one service per aggregate instead of one use case per action.
 */
@Injectable()
export class StaffService {
  constructor(
    @Inject(STAFF_REPOSITORY_TOKEN) private readonly staff: IStaffRepository,
    @Inject(TOKENS.MEMBERSHIP_REPOSITORY) private readonly memberships: IMembershipRepository,
  ) {}

  list(organizationId: string, includeInactive = false): Promise<StaffData[]> {
    return this.staff.findAll(organizationId, includeInactive);
  }

  async get(id: string, organizationId: string): Promise<StaffDetail> {
    const member = await this.getOrThrow(id, organizationId);
    return { ...member, upcomingTimeOff: await this.staff.findUpcomingTimeOff(id, new Date()) };
  }

  async create(organizationId: string, data: StaffWriteData): Promise<StaffData> {
    await this.assertUserIsMember(data.userId, organizationId);
    return this.staff.create(organizationId, data);
  }

  async update(id: string, organizationId: string, data: Partial<StaffWriteData>): Promise<StaffData> {
    await this.getOrThrow(id, organizationId);
    await this.assertUserIsMember(data.userId, organizationId);
    return this.staff.update(id, data);
  }

  async setWorkingHours(
    id: string,
    organizationId: string,
    ranges: WorkingHoursRange[],
  ): Promise<StaffData> {
    await this.getOrThrow(id, organizationId);
    await this.staff.replaceWorkingHours(id, normalizeWorkingHours(ranges));
    return this.getOrThrow(id, organizationId);
  }

  async addTimeOff(
    id: string,
    organizationId: string,
    data: { startTime: Date; endTime: Date; reason?: string | null },
  ): Promise<TimeOffData> {
    await this.getOrThrow(id, organizationId);
    if (data.endTime <= data.startTime) throw new BadRequestException('endTime must be after startTime');
    return this.staff.addTimeOff(id, { ...data, reason: data.reason?.trim() || null });
  }

  async removeTimeOff(id: string, organizationId: string, timeOffId: string): Promise<void> {
    await this.getOrThrow(id, organizationId);
    if (!(await this.staff.deleteTimeOff(id, timeOffId))) throw new NotFoundException('Time off not found');
  }

  private async getOrThrow(id: string, organizationId: string): Promise<StaffData> {
    const member = await this.staff.findById(id, organizationId);
    if (!member) throw new NotFoundException('Staff member not found');
    return member;
  }

  /** A staff member can be linked to a system user, but only to a member of the same organization. */
  private async assertUserIsMember(userId: string | null | undefined, organizationId: string) {
    if (!userId) return;
    const membership = await this.memberships.findByUserAndOrganization(userId, organizationId);
    if (!membership) throw new BadRequestException('userId is not a member of this organization');
  }
}

@Injectable()
export class ResourcesService {
  constructor(@Inject(RESOURCE_REPOSITORY_TOKEN) private readonly resources: IResourceRepository) {}

  list(organizationId: string, includeInactive = false): Promise<ResourceData[]> {
    return this.resources.findAll(organizationId, includeInactive);
  }

  create(organizationId: string, name: string): Promise<ResourceData> {
    return this.resources.create(organizationId, name.trim());
  }

  async update(
    id: string,
    organizationId: string,
    data: { name?: string; isActive?: boolean },
  ): Promise<ResourceData> {
    if (!(await this.resources.findById(id, organizationId))) {
      throw new NotFoundException('Resource not found');
    }
    return this.resources.update(id, { ...data, name: data.name?.trim() });
  }
}
