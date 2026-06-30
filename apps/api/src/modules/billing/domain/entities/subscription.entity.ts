import { SubscriptionStatus } from '../value-objects/subscription-status.vo';

export interface SubscriptionEntityProps {
  id: string;
  organizationId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SubscriptionEntity {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly planId: string;
  public readonly planName: string;
  public readonly status: SubscriptionStatus;
  public readonly startDate: Date;
  public readonly endDate: Date | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: SubscriptionEntityProps) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.planId = props.planId;
    this.planName = props.planName;
    this.status = props.status;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: Omit<SubscriptionEntityProps, 'status' | 'createdAt' | 'updatedAt'>): SubscriptionEntity {
    return new SubscriptionEntity({
      ...props,
      status: SubscriptionStatus.active(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: SubscriptionEntityProps): SubscriptionEntity {
    return new SubscriptionEntity(props);
  }

  isActive(): boolean {
    return this.status.isActive();
  }

  cancel(): SubscriptionEntity {
    if (this.status.isCanceled()) {
      throw new Error('Subscription is already canceled');
    }
    return new SubscriptionEntity({
      ...this._snapshot(),
      status: SubscriptionStatus.canceled(),
      endDate: new Date(),
      updatedAt: new Date(),
    });
  }

  changePlan(newPlanId: string, newPlanName: string): SubscriptionEntity {
    if (!this.isActive()) {
      throw new Error('Cannot change plan on an inactive subscription');
    }
    return new SubscriptionEntity({
      ...this._snapshot(),
      planId: newPlanId,
      planName: newPlanName,
      updatedAt: new Date(),
    });
  }

  markPastDue(): SubscriptionEntity {
    return new SubscriptionEntity({
      ...this._snapshot(),
      status: SubscriptionStatus.pastDue(),
      updatedAt: new Date(),
    });
  }

  private _snapshot(): SubscriptionEntityProps {
    return {
      id: this.id,
      organizationId: this.organizationId,
      planId: this.planId,
      planName: this.planName,
      status: this.status,
      startDate: this.startDate,
      endDate: this.endDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
