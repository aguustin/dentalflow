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
import { RequirePermissions } from '../../../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../../../shared/types/request-user.type';
import { CreatePatientUseCase } from '../../application/use-cases/create-patient.use-case';
import { GetPatientUseCase } from '../../application/use-cases/get-patient.use-case';
import { UpdatePatientUseCase } from '../../application/use-cases/update-patient.use-case';
import { DeletePatientUseCase } from '../../application/use-cases/delete-patient.use-case';
import { ListPatientsUseCase } from '../../application/use-cases/list-patients.use-case';
import { PatientDto, ListPatientsResult } from '../../application/dtos/patient.dto';
import { CreatePatientRequest } from '../requests/create-patient.request';
import { UpdatePatientRequest } from '../requests/update-patient.request';
import { ListPatientsRequest } from '../requests/list-patients.request';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(
    private readonly createPatient: CreatePatientUseCase,
    private readonly getPatient: GetPatientUseCase,
    private readonly updatePatient: UpdatePatientUseCase,
    private readonly deletePatient: DeletePatientUseCase,
    private readonly listPatients: ListPatientsUseCase,
  ) {}

  @Post()
  @RequirePermissions('patients.create')
  @ApiOperation({ summary: 'Register a new patient in the organization' })
  create(
    @Body() body: CreatePatientRequest,
    @CurrentUser() actor: RequestUser,
  ): Promise<PatientDto> {
    return this.createPatient.execute({
      organizationId: actor.organizationId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      documentId: body.documentId,
    });
  }

  @Get()
  @RequirePermissions('patients.read')
  @ApiOperation({ summary: 'List patients in the organization' })
  findAll(
    @Query() query: ListPatientsRequest,
    @CurrentUser() actor: RequestUser,
  ): Promise<ListPatientsResult> {
    return this.listPatients.execute(actor.organizationId, {
      name: query.name,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':id')
  @RequirePermissions('patients.read')
  @ApiOperation({ summary: 'Get a patient by ID' })
  findOne(@Param('id') id: string, @CurrentUser() actor: RequestUser): Promise<PatientDto> {
    return this.getPatient.execute(id, actor.organizationId);
  }

  @Put(':id')
  @RequirePermissions('patients.update')
  @ApiOperation({ summary: 'Update patient information' })
  update(
    @Param('id') id: string,
    @Body() body: UpdatePatientRequest,
    @CurrentUser() actor: RequestUser,
  ): Promise<PatientDto> {
    return this.updatePatient.execute(id, actor.organizationId, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      documentId: body.documentId,
    });
  }

  @Delete(':id')
  @RequirePermissions('patients.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a patient from the organization' })
  remove(@Param('id') id: string, @CurrentUser() actor: RequestUser): Promise<void> {
    return this.deletePatient.execute(id, actor.organizationId);
  }
}
