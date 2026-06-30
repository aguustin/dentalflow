import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { IEventBus } from '../../../shared/types/event-bus.interface';
import { UserCreatedEvent } from '../../../domain/events/user-created.event';
import { TOKENS } from '../../../shared/injection-tokens';
import { hashPassword } from '../../../shared/utils/hash.util';
import { CreateUserDto, UserResponseDto } from '../../dtos/user.dto';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(TOKENS.USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKENS.EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(dto: CreateUserDto): Promise<UserResponseDto> {
    const exists = await this.userRepository.existsByEmail(dto.email);
    if (exists) throw new ConflictException('Email is already registered');

    const passwordHash = await hashPassword(dto.password);
    const id = randomUUID();

    const user = await this.userRepository.create({
      id,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    await this.eventBus.publish(new UserCreatedEvent(user.id, user.email));

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
