export class OrganizationEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: {
    id: string;
    name: string;
    slug: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): OrganizationEntity {
    return new OrganizationEntity(
      props.id,
      props.name,
      props.slug,
      props.isActive ?? true,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
    );
  }
}
