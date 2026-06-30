import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IEventBus } from '../../../../shared/types/event-bus.interface';
import { DomainEvent } from '../../../../domain/events/domain-event.base';
import { TOKENS } from '../../../../shared/injection-tokens';
import { DOMAIN_EVENT_TYPES } from '../../../../shared/contracts/events/domain-event.contract';
import { IncrementUsageUseCase } from '../../application/use-cases/increment-usage.use-case';

/**
 * BillingEventSubscriber — reacts to domain events from other modules
 * WITHOUT importing anything from those modules.
 *
 * Contract: only the event type string and the top-level `organizationId`
 * field (both part of the global DomainEvent contract) are used.
 * No coupling to Patients or Appointments internal types.
 */
@Injectable()
export class BillingEventSubscriber implements OnModuleInit {
  private readonly logger = new Logger(BillingEventSubscriber.name);

  constructor(
    @Inject(TOKENS.EVENT_BUS)
    private readonly eventBus: IEventBus,
    private readonly incrementUsage: IncrementUsageUseCase,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe(DOMAIN_EVENT_TYPES.PATIENT_CREATED, {
      handle: (event: DomainEvent) => this.onPatientCreated(event),
    });

    this.eventBus.subscribe(DOMAIN_EVENT_TYPES.APPOINTMENT_CREATED, {
      handle: (event: DomainEvent) => this.onAppointmentCreated(event),
    });

    this.logger.log('Billing event subscriptions registered');
  }

  private async onPatientCreated(event: DomainEvent): Promise<void> {
    if (!event.organizationId) return;
    await this.incrementUsage.execute(event.organizationId, 'patients');
    this.logger.debug(
      `[chain:${event.eventChainId}] Usage incremented: patients for org=${event.organizationId}`,
    );
  }

  private async onAppointmentCreated(event: DomainEvent): Promise<void> {
    if (!event.organizationId) return;
    await this.incrementUsage.execute(event.organizationId, 'appointments');
    this.logger.debug(
      `[chain:${event.eventChainId}] Usage incremented: appointments for org=${event.organizationId}`,
    );
  }
}
