import { Module } from '@nestjs/common';
import { CUSTOMER_REPOSITORY_TOKEN } from './customers.tokens';
import { CustomerPrismaRepository } from './infrastructure/repositories/customer.prisma.repository';
import { CustomerValidationService } from './application/services/customer-validation.service';
import { CreateCustomerUseCase } from './application/use-cases/create-customer.use-case';
import { GetCustomerUseCase } from './application/use-cases/get-customer.use-case';
import { UpdateCustomerUseCase } from './application/use-cases/update-customer.use-case';
import { DeleteCustomerUseCase } from './application/use-cases/delete-customer.use-case';
import { ListCustomersUseCase } from './application/use-cases/list-customers.use-case';
import { CustomersController } from './api/controllers/customers.controller';

@Module({
  controllers: [CustomersController],
  providers: [
    { provide: CUSTOMER_REPOSITORY_TOKEN, useClass: CustomerPrismaRepository },
    CustomerValidationService,
    CreateCustomerUseCase,
    GetCustomerUseCase,
    UpdateCustomerUseCase,
    DeleteCustomerUseCase,
    ListCustomersUseCase,
  ],
})
export class CustomersModule {}
