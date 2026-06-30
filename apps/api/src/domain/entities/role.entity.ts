export class RoleEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly organizationId: string,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    name: string;
    organizationId: string;
    createdAt?: Date;
  }): RoleEntity {
    return new RoleEntity(props.id, props.name, props.organizationId, props.createdAt ?? new Date());
  }
}
