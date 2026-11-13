import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { RequireModule } from '../../../../shared/decorators/require-module.decorator';
import { RequirePermissions } from '../../../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../../../shared/types/request-user.type';
import { CreateCustomerUseCase } from '../../application/use-cases/create-customer.use-case';
import { GetCustomerUseCase } from '../../application/use-cases/get-customer.use-case';
import { UpdateCustomerUseCase } from '../../application/use-cases/update-customer.use-case';
import { DeleteCustomerUseCase } from '../../application/use-cases/delete-customer.use-case';
import { ListCustomersUseCase } from '../../application/use-cases/list-customers.use-case';
import { CustomerDto, ListCustomersResult } from '../../application/dtos/customer.dto';
import { CreateCustomerRequest } from '../requests/create-customer.request';
import { UpdateCustomerRequest } from '../requests/update-customer.request';
import { ListCustomersRequest } from '../requests/list-customers.request';

@ApiTags('Customers')
@ApiBearerAuth()
@RequireModule('customers')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly createCustomer: CreateCustomerUseCase,
    private readonly getCustomer: GetCustomerUseCase,
    private readonly updateCustomer: UpdateCustomerUseCase,
    private readonly deleteCustomer: DeleteCustomerUseCase,
    private readonly listCustomers: ListCustomersUseCase,
  ) {}

  @Post()
  @RequirePermissions('customers.create')
  @ApiOperation({ summary: 'Register a new customer in the organization' })
  create(
    @Body() body: CreateCustomerRequest,
    @CurrentUser() actor: RequestUser,
  ): Promise<CustomerDto> {
    return this.createCustomer.execute({
      organizationId: actor.organizationId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      documentId: body.documentId,
      attributes: body.attributes,
    });
  }

  @Get()
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'List customers in the organization' })
  findAll(
    @Query() query: ListCustomersRequest,
    @CurrentUser() actor: RequestUser,
  ): Promise<ListCustomersResult> {
    return this.listCustomers.execute(actor.organizationId, {
      name: query.name,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':id')
  @RequirePermissions('customers.read')
  @ApiOperation({ summary: 'Get a customer by ID' })
  findOne(@Param('id') id: string, @CurrentUser() actor: RequestUser): Promise<CustomerDto> {
    return this.getCustomer.execute(id, actor.organizationId);
  }

  @Put(':id')
  @RequirePermissions('customers.update')
  @ApiOperation({ summary: 'Update customer information' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateCustomerRequest,
    @CurrentUser() actor: RequestUser,
  ): Promise<CustomerDto> {
    return this.updateCustomer.execute(id, actor.organizationId, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      documentId: body.documentId,
      attributes: body.attributes,
    });
  }

  @Delete(':id')
  @RequirePermissions('customers.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a customer from the organization' })
  remove(@Param('id') id: string, @CurrentUser() actor: RequestUser): Promise<void> {
    return this.deleteCustomer.execute(id, actor.organizationId);
  }
}
