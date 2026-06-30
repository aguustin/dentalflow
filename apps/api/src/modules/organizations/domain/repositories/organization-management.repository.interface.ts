export interface UpdateOrganizationData {
  name?: string;
  slug?: string;
}

export interface IOrganizationManagementRepository {
  update(id: string, data: UpdateOrganizationData): Promise<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    updatedAt: Date;
  }>;
}
