import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../../../shared/decorators/public.decorator';
import { CurrentUser } from '../../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../../shared/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { RequestUser } from '../../../../shared/types/request-user.type';
import { CreateOrganizationOnboardingUseCase } from '../../application/use-cases/create-organization-onboarding.use-case';
import { GetCurrentOrganizationUseCase } from '../../application/use-cases/get-current-organization.use-case';
import { UpdateOrganizationUseCase } from '../../application/use-cases/update-organization.use-case';
import { CreateOrganizationRequest } from '../requests/create-organization.request';
import { UpdateOrganizationRequest } from '../requests/update-organization.request';
import {
  OrganizationOnboardingResponse,
  CurrentOrganizationResponse,
  UpdateOrganizationResponse,
} from '../responses/organization-onboarding.response';

@Controller('organizations')
export class OrganizationsOnboardingController {
  constructor(
    private readonly createOnboarding: CreateOrganizationOnboardingUseCase,
    private readonly getCurrent: GetCurrentOrganizationUseCase,
    private readonly updateOrg: UpdateOrganizationUseCase,
  ) {}

  /**
   * Creates a new organization and fully initializes the platform:
   * admin role, owner user, full permissions, FREE billing subscription.
   * Returns login credentials hint — immediately usable.
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateOrganizationRequest,
  ): Promise<OrganizationOnboardingResponse> {
    const result = await this.createOnboarding.execute({
      organizationName: body.organizationName,
      slug: body.slug,
      ownerEmail: body.ownerEmail,
      ownerFirstName: body.ownerFirstName,
      ownerLastName: body.ownerLastName,
      ownerPassword: body.ownerPassword,
      planName: body.planName,
      vertical: body.vertical,
    });
    return OrganizationOnboardingResponse.from(result);
  }

  /**
   * Returns the current user's organization with subscription info.
   */
  @UseGuards(JwtAuthGuard)
  @Get('current')
  async current(@CurrentUser() user: RequestUser): Promise<CurrentOrganizationResponse> {
    const dto = await this.getCurrent.execute(user.organizationId);
    return CurrentOrganizationResponse.from(dto);
  }

  /**
   * Updates organization metadata (name, slug).
   * Only the organization's own members with manage permission can update.
   */
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('organizations.manage')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateOrganizationRequest,
    @CurrentUser() user: RequestUser,
  ): Promise<UpdateOrganizationResponse> {
    const result = await this.updateOrg.execute({
      id,
      organizationId: user.organizationId,
      name: body.name,
      slug: body.slug,
    });
    return UpdateOrganizationResponse.from(result);
  }
}
