import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { AppointmentEntity } from '../../domain/entities/appointment.entity';
import { AppointmentCreatedEvent } from '../../domain/events/appointment-created.event';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { TOKENS } from '../../../../shared/injection-tokens';
import { APPOINTMENT_REPOSITORY_TOKEN, CUSTOMER_EXISTENCE_CHECKER_TOKEN } from '../../appointments.tokens';
import { CreateAppointmentCommand, AppointmentDto, toAppointmentDto } from '../dtos/appointment.dto';
import { AppointmentOverlapService } from '../services/appointment-overlap.service';
import { ICustomerExistenceChecker } from '../services/customer-existence-checker.interface';

@Injectable()
export class CreateAppointmentUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY_TOKEN)
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
    @Inject(CUSTOMER_EXISTENCE_CHECKER_TOKEN)
    private readonly customerChecker: ICustomerExistenceChecker,
    private readonly overlapService: AppointmentOverlapService,
  ) {}

  async execute(command: CreateAppointmentCommand): Promise<AppointmentDto> {
    const customerExists = await this.customerChecker.existsInOrganization(
      command.customerId,
      command.organizationId,
    );
    if (!customerExists) {
      throw new NotFoundException(
        `Customer '${command.customerId}' not found in this organization`,
      );
    }

    const startTime = new Date(command.startTime);
    const endTime = new Date(command.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new UnprocessableEntityException('Invalid date format for startTime or endTime');
    }

    await this.overlapService.assertNoOverlap(
      command.customerId,
      command.organizationId,
      startTime,
      endTime,
    );

    let entity: AppointmentEntity;
    try {
      entity = AppointmentEntity.create({
        id: randomUUID(),
        organizationId: command.organizationId,
        customerId: command.customerId,
        title: command.title,
        description: command.description ?? null,
        startTime,
        endTime,
      });
    } catch (err: unknown) {
      throw new UnprocessableEntityException(err instanceof Error ? err.message : String(err));
    }

    const saved = await this.appointmentRepository.create(entity);

    await this.eventBus.publish(
      new AppointmentCreatedEvent(
        saved.id,
        saved.organizationId,
        saved.customerId,
        saved.timeRange.startTime,
        saved.timeRange.endTime,
      ),
    );

    return toAppointmentDto(saved);
  }
}
