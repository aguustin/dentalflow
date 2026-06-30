import { UserEntity } from '../entities/user.entity';

export interface CreateUserData {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  existsByEmail(email: string): Promise<boolean>;
}
