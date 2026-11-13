export const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';

export class OrganizationEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly vertical: string,
    public readonly enabledModules: string[],
    public readonly timezone: string,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: {
    id: string;
    name: string;
    slug: string;
    vertical: string;
    enabledModules: string[];
    timezone?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): OrganizationEntity {
    return new OrganizationEntity(
      props.id,
      props.name,
      props.slug,
      props.vertical,
      props.enabledModules,
      props.timezone ?? DEFAULT_TIMEZONE,
      props.isActive ?? true,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
    );
  }

  hasModule(module: string): boolean {
    return this.enabledModules.includes(module);
  }
}
