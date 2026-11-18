import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { DomainError } from '../../../shared/contracts/errors/domain.error';
import { PAYMENT_GATEWAY, PaymentGateway } from './payment-gateway.interface';

const PROVIDER = 'mercadopago';
const FREE_PLAN = 'free';

export type NotificationTopic = 'subscription' | 'charge' | 'other';

/**
 * Paid plans through Mercado Pago Subscriptions.
 *
 * Safety rules:
 *  - paid plans are only activated by Mercado Pago (never by a direct plan change);
 *  - notifications are not trusted: the current state is always fetched from Mercado Pago;
 *  - state is applied absolutely (idempotent) and each monthly charge is stored once (unique id).
 */
@Injectable()
export class SubscriptionPaymentsService {
  private readonly logger = new Logger(SubscriptionPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  /** Current plan, plans to choose from, recent charges. */
  async overview(organizationId: string) {
    const [subscription, plans, payments] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { organizationId },
        include: { plan: true },
      }),
      this.prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } }),
      this.prisma.billingPayment.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 24,
        select: { id: true, amount: true, currency: true, status: true, paidAt: true, createdAt: true },
      }),
    ]);
    return {
      subscription: subscription && {
        planName: subscription.plan.name,
        planDisplayName: subscription.plan.displayName,
        status: subscription.status,
        paidWithMercadoPago: !!subscription.mpPreapprovalId,
        nextPaymentDate: subscription.nextPaymentDate,
      },
      plans: plans.map((p) => ({
        name: p.name,
        displayName: p.displayName,
        price: Math.round(Number(p.price) * 100),
        currency: p.currency,
        features: p.features,
        maxCustomers: p.maxCustomers,
        maxAppointments: p.maxAppointments,
      })),
      payments,
      configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    };
  }

  /** Starts a paid subscription: returns the Mercado Pago URL where the customer authorizes it. */
  async startCheckout(organizationId: string, userId: string, planName: string) {
    const plan = await this.prisma.plan.findFirst({ where: { name: planName, isActive: true } });
    if (!plan) throw new NotFoundException(`Plan '${planName}' not found`);
    const amount = Math.round(Number(plan.price) * 100);
    if (amount <= 0) throw new DomainError('INVALID', 'The free plan does not need a payment');

    const current = await this.prisma.subscription.findUnique({ where: { organizationId } });
    if (current?.planId === plan.id && current.mpPreapprovalId && current.status === 'ACTIVE') {
      throw new DomainError('CONFLICT', `The organization is already paying the '${plan.name}' plan`);
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    // In test mode Mercado Pago requires the payer to be the test buyer account
    const payerEmail =
      process.env.NODE_ENV !== 'production' && process.env.MERCADOPAGO_TEST_PAYER_EMAIL
        ? process.env.MERCADOPAGO_TEST_PAYER_EMAIL
        : user.email;

    const checkoutId = randomUUID();
    const webUrl = process.env.APP_PUBLIC_WEB_URL ?? 'http://localhost:5173';
    const remote = await this.gateway.createSubscription({
      reason: `DentalFlow · plan ${plan.displayName}`,
      externalReference: `${organizationId}:${checkoutId}`,
      payerEmail,
      amount,
      currency: plan.currency,
      backUrl: `${webUrl}/billing?checkout=${checkoutId}`,
      idempotencyKey: checkoutId,
    });
    await this.prisma.billingCheckout.create({
      data: { id: checkoutId, organizationId, planId: plan.id, mpPreapprovalId: remote.id, createdBy: userId },
    });
    return { checkoutId, initPoint: remote.initPoint };
  }

  /** Back to the free plan, cancelling the Mercado Pago subscription so it stops charging. */
  async cancel(organizationId: string) {
    const current = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: { select: { name: true } } },
    });
    if (!current) throw new NotFoundException('No subscription found for this organization');
    if (current.plan.name === FREE_PLAN && !current.mpPreapprovalId) {
      throw new DomainError('CONFLICT', 'The organization is already on the free plan');
    }
    if (current.mpPreapprovalId) await this.gateway.cancelSubscription(current.mpPreapprovalId);
    await this.downgradeToFree(organizationId);
    return this.overview(organizationId);
  }

  /**
   * Processes a VERIFIED notification (signature checked by the caller). Duplicates of an
   * already processed notification are skipped; everything else is idempotent anyway.
   */
  async handleNotification(n: { topic: NotificationTopic; resourceId: string; requestId: string }) {
    if (n.topic === 'other') return { ignored: true };

    const existing = await this.prisma.webhookEvent.findUnique({
      where: { provider_requestId: { provider: PROVIDER, requestId: n.requestId } },
    });
    if (existing?.processedAt) return { duplicate: true };
    const event =
      existing ??
      (await this.prisma.webhookEvent
        .create({ data: { provider: PROVIDER, topic: n.topic, resourceId: n.resourceId, requestId: n.requestId } })
        .catch(async (err: unknown) => {
          // Same notification arriving twice at the same time: the other request handles it
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return null;
          throw err;
        }));
    if (!event) return { duplicate: true };

    try {
      if (n.topic === 'subscription') await this.syncSubscription(n.resourceId);
      else await this.syncCharge(n.resourceId);
      await this.prisma.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date(), error: null } });
      return { processed: true };
    } catch (err) {
      await this.prisma.webhookEvent.update({ where: { id: event.id }, data: { error: String(err).slice(0, 500) } });
      throw err; // non-2xx → Mercado Pago retries
    }
  }

  // ── Sync from Mercado Pago (source of truth) ──────────────────────────────

  private async syncSubscription(preapprovalId: string) {
    const remote = await this.gateway.getSubscription(preapprovalId);
    const checkout = await this.prisma.billingCheckout.findUnique({ where: { mpPreapprovalId: preapprovalId } });
    if (!checkout) {
      this.logger.warn(`Notification for unknown preapproval ${preapprovalId} — ignored`);
      return;
    }
    await this.prisma.billingCheckout.update({ where: { id: checkout.id }, data: { status: remote.status } });
    const current = await this.prisma.subscription.findUnique({ where: { organizationId: checkout.organizationId } });
    if (!current) return;

    if (remote.status === 'authorized') {
      const previous = current.mpPreapprovalId;
      await this.prisma.subscription.update({
        where: { id: current.id },
        data: {
          planId: checkout.planId,
          status: 'ACTIVE',
          mpPreapprovalId: preapprovalId,
          nextPaymentDate: remote.nextPaymentDate,
          endDate: null,
        },
      });
      // Plan switch: the old Mercado Pago subscription must stop charging
      if (previous && previous !== preapprovalId) {
        await this.gateway
          .cancelSubscription(previous)
          .catch((err) => this.logger.error(`Could not cancel previous preapproval ${previous}: ${String(err)}`));
      }
    } else if (current.mpPreapprovalId === preapprovalId) {
      if (remote.status === 'paused') {
        await this.prisma.subscription.update({ where: { id: current.id }, data: { status: 'PAST_DUE' } });
      } else if (remote.status === 'cancelled') {
        await this.downgradeToFree(checkout.organizationId);
      }
    }
  }

  private async syncCharge(chargeId: string) {
    const charge = await this.gateway.getCharge(chargeId);
    const checkout = await this.prisma.billingCheckout.findUnique({ where: { mpPreapprovalId: charge.subscriptionId } });
    if (!checkout) {
      this.logger.warn(`Charge ${chargeId} of unknown preapproval ${charge.subscriptionId} — ignored`);
      return;
    }
    const approved = charge.status === 'approved';
    // Unique mpPaymentId: a repeated notification updates, never duplicates
    const update = { status: charge.status, amount: charge.amount, ...(approved && { paidAt: charge.date ?? new Date() }) };
    await this.prisma.billingPayment
      .upsert({
        where: { mpPaymentId: charge.id },
        create: {
          organizationId: checkout.organizationId,
          mpPaymentId: charge.id,
          mpPreapprovalId: charge.subscriptionId,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status,
          paidAt: approved ? (charge.date ?? new Date()) : null,
        },
        update,
      })
      .catch((err: unknown) => {
        // Two simultaneous notifications of the same charge: the other one inserted it
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          return this.prisma.billingPayment.update({ where: { mpPaymentId: charge.id }, data: update });
        }
        throw err;
      });

    const current = await this.prisma.subscription.findUnique({ where: { organizationId: checkout.organizationId } });
    if (current?.mpPreapprovalId !== charge.subscriptionId) return;
    if (approved && current.status !== 'ACTIVE') {
      await this.prisma.subscription.update({ where: { id: current.id }, data: { status: 'ACTIVE' } });
    } else if (charge.status === 'rejected') {
      await this.prisma.subscription.update({ where: { id: current.id }, data: { status: 'PAST_DUE' } });
    }
  }

  private async downgradeToFree(organizationId: string) {
    const free = await this.prisma.plan.findUniqueOrThrow({ where: { name: FREE_PLAN } });
    await this.prisma.subscription.update({
      where: { organizationId },
      data: { planId: free.id, status: 'ACTIVE', mpPreapprovalId: null, nextPaymentDate: null },
    });
  }
}
