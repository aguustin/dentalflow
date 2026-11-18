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
  /**
   * Without `cardTokenId`: creates a pending subscription the customer authorizes at `initPoint`.
   * With `cardTokenId` (single-use token from Mercado Pago's card form; the card number never
   * reaches us): creates it already authorized — Mercado Pago charges the first installment
   * and rejects the request if the card is declined.
   */
  createSubscription(input: {
    reason: string;
    externalReference: string;
    payerEmail: string;
    /** cents */
    amount: number;
    currency: string;
    backUrl: string;
    idempotencyKey: string;
    cardTokenId?: string;
  }): Promise<{ id: string; initPoint: string; status?: GatewaySubscriptionStatus }>;
  getSubscription(id: string): Promise<GatewaySubscription>;
  cancelSubscription(id: string): Promise<void>;
  /** A monthly charge of a subscription (authorized payment). */
  getCharge(id: string): Promise<GatewayCharge>;
}
