import { Controller, Delete, Get, Post, Query, Redirect } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../shared/decorators/public.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { RequirePermissions } from '../../../shared/decorators/require-permissions.decorator';
import { RequestUser } from '../../../shared/types/request-user.type';
import { PaymentAccountsService } from '../application/payment-accounts.service';

/** The organization's own Mercado Pago account (to collect from its customers). Owner/admin only. */
@ApiTags('Online payments')
@ApiBearerAuth()
@Controller('payment-accounts/mercadopago')
export class PaymentAccountsController {
  constructor(private readonly accounts: PaymentAccountsService) {}

  @Get()
  @RequirePermissions('billing.read')
  @ApiOperation({ summary: 'Connection status of the Mercado Pago account (no secrets)' })
  status(@CurrentUser() actor: RequestUser) {
    return this.accounts.status(actor.organizationId);
  }

  @Post('connect')
  @RequirePermissions('billing.update')
  @ApiOperation({ summary: 'Start the connection: returns the Mercado Pago authorization URL' })
  connect(@CurrentUser() actor: RequestUser) {
    return this.accounts.startConnect(actor.organizationId, actor.userId);
  }

  @Delete()
  @RequirePermissions('billing.update')
  @ApiOperation({ summary: 'Disconnect the Mercado Pago account (deletes its credentials)' })
  disconnect(@CurrentUser() actor: RequestUser) {
    return this.accounts.disconnect(actor.organizationId);
  }
}

/** Mercado Pago sends the browser back here after the authorization. Public: the signed state authenticates. */
@Controller('oauth/mercadopago')
export class MercadoPagoOAuthCallbackController {
  constructor(private readonly accounts: PaymentAccountsService) {}

  @Public()
  @Get('callback')
  @Redirect()
  @ApiExcludeEndpoint()
  async callback(@Query('code') code?: string, @Query('state') state?: string, @Query('error') error?: string) {
    const result = await this.accounts.completeConnect({ code, state, error });
    const web = process.env.APP_PUBLIC_WEB_URL ?? 'http://localhost:5173';
    const query = result.ok ? 'mp=connected' : `mp=error&reason=${result.reason}`;
    return { url: `${web}/settings/payments?${query}`, statusCode: 302 };
  }
}
