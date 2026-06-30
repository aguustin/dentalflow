export class MembershipEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly organizationId: string,
    public readonly roleId: string,
    public readonly isActive: boolean,
    public readonly joinedAt: Date,
  ) {}

  static create(props: {
    id: string;
    userId: string;
    organizationId: string;
    roleId: string;
    isActive?: boolean;
    joinedAt?: Date;
  }): MembershipEntity {
    return new MembershipEntity(
      props.id,
      props.userId,
      props.organizationId,
      props.roleId,
      props.isActive ?? true,
      props.joinedAt ?? new Date(),
    );
  }
}
