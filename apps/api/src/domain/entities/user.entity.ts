export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  static create(props: {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): UserEntity {
    return new UserEntity(
      props.id,
      props.email,
      props.passwordHash,
      props.firstName,
      props.lastName,
      props.isActive ?? true,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
    );
  }
}
