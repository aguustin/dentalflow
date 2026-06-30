import { OrganizationEntity } from '../entities/organization.entity';

export interface CreateOrganizationData {
  id: string;
  name: string;
  slug: string;
}

export interface IOrganizationRepository {
  findById(id: string): Promise<OrganizationEntity | null>;
  findBySlug(slug: string): Promise<OrganizationEntity | null>;
  create(data: CreateOrganizationData): Promise<OrganizationEntity>;
  existsBySlug(slug: string): Promise<boolean>;
}
