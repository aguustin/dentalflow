import { Module } from '@nestjs/common';
import { APPOINTMENT_REPOSITORY_TOKEN, CUSTOMER_EXISTENCE_CHECKER_TOKEN } from './appointments.tokens';
import { AppointmentPrismaRepository } from './infrastructure/repositories/appointment.prisma.repository';
import { PrismaCustomerExistenceChecker } from './infrastructure/checkers/customer-existence.checker';
import { AppointmentOverlapService } from './application/services/appointment-overlap.service';
import { CreateAppointmentUseCase } from './application/use-cases/create-appointment.use-case';
import { GetAppointmentUseCase } from './application/use-cases/get-appointment.use-case';
import { ListAppointmentsUseCase } from './application/use-cases/list-appointments.use-case';
import { CancelAppointmentUseCase } from './application/use-cases/cancel-appointment.use-case';
import { CompleteAppointmentUseCase } from './application/use-cases/complete-appointment.use-case';
import { RescheduleAppointmentUseCase } from './application/use-cases/reschedule-appointment.use-case';
import { AppointmentsController } from './api/controllers/appointments.controller';

@Module({
  controllers: [AppointmentsController],
  providers: [
    { provide: APPOINTMENT_REPOSITORY_TOKEN, useClass: AppointmentPrismaRepository },
    { provide: CUSTOMER_EXISTENCE_CHECKER_TOKEN, useClass: PrismaCustomerExistenceChecker },
    AppointmentOverlapService,
    CompleteAppointmentUseCase,       // declared first — RescheduleUseCase depends on it
    CreateAppointmentUseCase,
    GetAppointmentUseCase,
    ListAppointmentsUseCase,
    CancelAppointmentUseCase,
    RescheduleAppointmentUseCase,
  ],
})
export class AppointmentsModule {}
