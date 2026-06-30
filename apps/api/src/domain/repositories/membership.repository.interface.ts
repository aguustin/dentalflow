import { MembershipEntity } from '../entities/membership.entity';

export interface CreateMembershipData {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
}

export interface IMembershipRepository {
  findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<MembershipEntity | null>;
  findAllByUser(userId: string): Promise<MembershipEntity[]>;
  findAllByOrganization(organizationId: string): Promise<MembershipEntity[]>;
  create(data: CreateMembershipData): Promise<MembershipEntity>;
  updateRole(membershipId: string, roleId: string): Promise<MembershipEntity>;
  existsByUserAndOrganization(userId: string, organizationId: string): Promise<boolean>;
}
