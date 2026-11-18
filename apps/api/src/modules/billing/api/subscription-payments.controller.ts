import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Public } from '../../../shared/decorators/public.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../../shared/types/request-user.type';
import { NotificationTopic, SubscriptionPaymentsService } from '../application/subscription-payments.service';
import { verifyMercadoPagoSignature } from '../domain/mercadopago-signature';

class CheckoutRequest {
  @ApiProperty({ example: 'pro' })
  @IsString()
  @IsNotEmpty()
  planName: string;
}

class CardSubscriptionRequest extends CheckoutRequest {
  @ApiProperty({ description: "Single-use card token from Mercado Pago's card form" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  cardTokenId: string;
}

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class SubscriptionPaymentsController {
  constructor(private readonly payments: SubscriptionPaymentsService) {}

  @Get('plan')
  @RequirePermissions('billing.read')
  @ApiOperation({ summary: 'Current plan, available plans and recent charges' })
  overview(@CurrentUser() actor: RequestUser) {
    return this.payments.overview(actor.organizationId, actor.userId);
  }

  @Post('subscribe-card')
  @RequirePermissions('billing.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to a paid plan with a card entered in the app (Mercado Pago card token)' })
  subscribeWithCard(@Body() body: CardSubscriptionRequest, @CurrentUser() actor: RequestUser) {
    return this.payments.subscribeWithCard(actor.organizationId, actor.userId, body.planName, body.cardTokenId);
  }

  @Post('checkout')
  @RequirePermissions('billing.update')
  @ApiOperation({ summary: 'Subscribe to a paid plan: returns the Mercado Pago URL to authorize it' })
  checkout(@Body() body: CheckoutRequest, @CurrentUser() actor: RequestUser) {
    return this.payments.startCheckout(actor.organizationId, actor.userId, body.planName);
  }
}

/** Mercado Pago notifications. Public: the signature is the only authentication. */
@Controller('webhooks')
export class MercadoPagoWebhookController {
  private readonly logger = new Logger(MercadoPagoWebhookController.name);

  constructor(private readonly payments: SubscriptionPaymentsService) {}

  @Public()
  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async notify(
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
    @Query() query: Record<string, string>,
    @Body() body: Record<string, unknown>,
  ) {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) throw new ServiceUnavailableException('Webhook secret not configured');

    const data = (body?.data ?? {}) as { id?: string | number };
    const resourceId = String(query['data.id'] ?? data.id ?? '');
    const type = String(query.type ?? query.topic ?? body?.type ?? '');

    if (!resourceId || !xRequestId || !verifyMercadoPagoSignature({ secret, xSignature, xRequestId, dataId: resourceId })) {
      this.logger.warn(`Rejected Mercado Pago notification (bad signature) type=${type} id=${resourceId}`);
      throw new UnauthorizedException('Invalid signature');
    }

    return this.payments.handleNotification({ topic: topicOf(type), resourceId, requestId: xRequestId });
  }
}

function topicOf(type: string): NotificationTopic {
  if (type === 'subscription_preapproval' || type === 'preapproval') return 'subscription';
  if (type === 'subscription_authorized_payment' || type === 'authorized_payment') return 'charge';
  return 'other';
}
