import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DomainError } from '../../../shared/contracts/errors/domain.error';
import {
  GatewayCharge,
  GatewaySubscription,
  GatewaySubscriptionStatus,
  PaymentGateway,
} from '../application/payment-gateway.interface';

const API = 'https://api.mercadopago.com';
const TIMEOUT_MS = 15_000;

/** Mercado Pago Subscriptions (preapproval API) over plain HTTPS. */
@Injectable()
export class MercadoPagoGateway implements PaymentGateway {
  private readonly logger = new Logger(MercadoPagoGateway.name);

  private get token(): string {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new ServiceUnavailableException('Mercado Pago is not configured (MERCADOPAGO_ACCESS_TOKEN)');
    return token;
  }

  async createSubscription(input: {
    reason: string;
    externalReference: string;
    payerEmail: string;
    amount: number;
    currency: string;
    backUrl: string;
    idempotencyKey: string;
    cardTokenId?: string;
  }): Promise<{ id: string; initPoint: string; status: GatewaySubscriptionStatus }> {
    const body = await this.request<{ id: string; init_point: string; status: GatewaySubscriptionStatus }>('POST', '/preapproval', {
      body: {
        reason: input.reason,
        external_reference: input.externalReference,
        payer_email: input.payerEmail,
        back_url: input.backUrl,
        ...(input.cardTokenId
          ? { card_token_id: input.cardTokenId, status: 'authorized' }
          : { status: 'pending' }),
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: input.amount / 100,
          currency_id: input.currency,
        },
      },
      idempotencyKey: input.idempotencyKey,
    });
    return { id: body.id, initPoint: body.init_point, status: body.status };
  }

  async getSubscription(id: string): Promise<GatewaySubscription> {
    const p = await this.request<{
      id: string;
      status: GatewaySubscriptionStatus;
      external_reference?: string | null;
      next_payment_date?: string | null;
    }>('GET', `/preapproval/${encodeURIComponent(id)}`);
    return {
      id: p.id,
      status: p.status,
      externalReference: p.external_reference ?? null,
      nextPaymentDate: p.next_payment_date ? new Date(p.next_payment_date) : null,
    };
  }

  async cancelSubscription(id: string): Promise<void> {
    await this.request('PUT', `/preapproval/${encodeURIComponent(id)}`, { body: { status: 'cancelled' } });
  }

  async getCharge(id: string): Promise<GatewayCharge> {
    const c = await this.request<{
      id: number | string;
      preapproval_id: string;
      status: string;
      transaction_amount: number;
      currency_id: string;
      date_created?: string;
      payment?: { status?: string } | null;
    }>('GET', `/authorized_payments/${encodeURIComponent(id)}`);
    return {
      id: String(c.id),
      subscriptionId: c.preapproval_id,
      // The inner payment carries the real outcome (approved / rejected)
      status: c.payment?.status ?? c.status,
      amount: Math.round(c.transaction_amount * 100),
      currency: c.currency_id,
      date: c.date_created ? new Date(c.date_created) : null,
    };
  }

  private async request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    opts: { body?: unknown; idempotencyKey?: string } = {},
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${API}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...(opts.idempotencyKey && { 'X-Idempotency-Key': opts.idempotencyKey }),
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.error(`Mercado Pago unreachable: ${method} ${path}: ${String(err)}`);
      throw new ServiceUnavailableException('Mercado Pago is not reachable right now. Try again in a few minutes.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Never log the token; the body only has Mercado Pago's error description
      this.logger.error(`Mercado Pago ${res.status} on ${method} ${path}: ${JSON.stringify(data)}`);
      const message = (data as { message?: string }).message;
      // 400/422: Mercado Pago refused this request (e.g. card declined, invalid token) — not an outage
      if (res.status === 400 || res.status === 422) {
        throw new DomainError('INVALID', `Mercado Pago rejected the request${message ? `: ${message}` : ''}`, {
          reason: 'GATEWAY_REJECTED',
          providerMessage: message ?? null,
        });
      }
      throw new ServiceUnavailableException(`Mercado Pago rejected the request${message ? `: ${message}` : ''}`);
    }
    return data as T;
  }
}
