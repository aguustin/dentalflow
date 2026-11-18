import { Module } from '@nestjs/common';
import { MercadoPagoOAuthCallbackController, PaymentAccountsController } from './api/payment-accounts.controller';
import { PaymentAccountsService } from './application/payment-accounts.service';
import { MP_OAUTH_CLIENT } from './application/mercadopago-oauth.client';
import { MercadoPagoOAuthHttpClient } from './infrastructure/mercadopago-oauth.http-client';

/** Collecting from the organization's customers through its own Mercado Pago account. */
@Module({
  controllers: [PaymentAccountsController, MercadoPagoOAuthCallbackController],
  providers: [PaymentAccountsService, { provide: MP_OAUTH_CLIENT, useClass: MercadoPagoOAuthHttpClient }],
  exports: [PaymentAccountsService],
})
export class OnlinePaymentsModule {}
