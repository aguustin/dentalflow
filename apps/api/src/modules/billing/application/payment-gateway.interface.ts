export const PAYMENT_GATEWAY = Symbol('PaymentGateway');

/** Mercado Pago preapproval status. */
export type GatewaySubscriptionStatus = 'pending' | 'authorized' | 'paused' | 'cancelled';

export interface GatewaySubscription {
  id: string;
  status: GatewaySubscriptionStatus;
  externalReference: string | null;
  nextPaymentDate: Date | null;
}

export interface GatewayCharge {
  id: string;
  subscriptionId: string;
  /** approved | rejected | pending … */
  status: string;
  /** cents */
  amount: number;
  currency: string;
  date: Date | null;
}

/**
 * Recurring billing provider. Implemented with Mercado Pago Subscriptions (preapproval);
 * card data never touches our servers.
 */
export interface PaymentGateway {
  /** Creates a pending subscription; the customer authorizes it at `initPoint`. */
  createSubscription(input: {
    reason: string;
    externalReference: string;
    payerEmail: string;
    /** cents */
    amount: number;
    currency: string;
    backUrl: string;
    idempotencyKey: string;
  }): Promise<{ id: string; initPoint: string }>;
  getSubscription(id: string): Promise<GatewaySubscription>;
  cancelSubscription(id: string): Promise<void>;
  /** A monthly charge of a subscription (authorized payment). */
  getCharge(id: string): Promise<GatewayCharge>;
}
