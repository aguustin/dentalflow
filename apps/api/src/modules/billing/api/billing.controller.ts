import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../shared/guards/permissions.guard';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequestUser } from '../../../shared/types/request-user.type';
import { CreateSubscriptionUseCase } from '../application/use-cases/create-subscription.use-case';
import { ChangePlanUseCase } from '../application/use-cases/change-plan.use-case';
import { CancelSubscriptionUseCase } from '../application/use-cases/cancel-subscription.use-case';
import { GetUsageStatsUseCase } from '../application/use-cases/get-usage-stats.use-case';
import { GetSubscriptionUseCase } from '../application/use-cases/get-subscription.use-case';
import { CreateSubscriptionRequest } from './requests/create-subscription.request';
import { ChangePlanRequest } from './requests/change-plan.request';
import { SubscriptionResponse } from './responses/subscription.response';
import { UsageResponse } from './responses/usage.response';
import { SubscriptionPaymentsService } from '../application/subscription-payments.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private readonly createSubscription: CreateSubscriptionUseCase,
    private readonly changePlan: ChangePlanUseCase,
    private readonly cancelSubscription: CancelSubscriptionUseCase,
    private readonly getUsageStats: GetUsageStatsUseCase,
    private readonly getSubscription: GetSubscriptionUseCase,
    private readonly payments: SubscriptionPaymentsService,
  ) {}

  @Post('subscription')
  @RequirePermissions('billing.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateSubscriptionRequest,
  ): Promise<SubscriptionResponse> {
    const dto = await this.createSubscription.execute({
      organizationId: user.organizationId,
      planName: body.planName,
    });
    return SubscriptionResponse.from(dto);
  }

  @Get('subscription')
  @RequirePermissions('billing.read')
  async getOne(@CurrentUser() user: RequestUser): Promise<SubscriptionResponse> {
    const dto = await this.getSubscription.execute(user.organizationId);
    return SubscriptionResponse.from(dto);
  }

  @Post('change-plan')
  @RequirePermissions('billing.update')
  @HttpCode(HttpStatus.OK)
  async change(
    @CurrentUser() user: RequestUser,
    @Body() body: ChangePlanRequest,
  ): Promise<SubscriptionResponse> {
    const dto = await this.changePlan.execute({
      organizationId: user.organizationId,
      newPlanName: body.newPlanName,
    });
    return SubscriptionResponse.from(dto);
  }

  @Post('cancel')
  @RequirePermissions('billing.delete')
  @HttpCode(HttpStatus.OK)
  async cancel(@CurrentUser() user: RequestUser) {
    // Back to the free plan; cancels the Mercado Pago subscription so it stops charging
    return this.payments.cancel(user.organizationId, user.userId);
  }

  @Get('usage')
  @RequirePermissions('billing.read')
  async usage(@CurrentUser() user: RequestUser): Promise<UsageResponse> {
    const dto = await this.getUsageStats.execute(user.organizationId);
    return UsageResponse.from(dto);
  }
}
