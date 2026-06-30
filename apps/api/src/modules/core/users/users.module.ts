import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { CreateUserUseCase } from '../../../application/use-cases/users/create-user.use-case';
import { GetUserUseCase } from '../../../application/use-cases/users/get-user.use-case';

@Module({
  controllers: [UsersController],
  providers: [CreateUserUseCase, GetUserUseCase],
})
export class UsersModule {}
