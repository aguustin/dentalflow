export enum AppointmentStatusEnum {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

// Maps each status to its set of valid next states
const ALLOWED_TRANSITIONS: Record<AppointmentStatusEnum, AppointmentStatusEnum[]> = {
  [AppointmentStatusEnum.SCHEDULED]: [
    AppointmentStatusEnum.CONFIRMED,
    AppointmentStatusEnum.CANCELLED,
    AppointmentStatusEnum.NO_SHOW,
  ],
  // A confirmed patient can still cancel or not show up
  [AppointmentStatusEnum.CONFIRMED]: [
    AppointmentStatusEnum.COMPLETED,
    AppointmentStatusEnum.CANCELLED,
    AppointmentStatusEnum.NO_SHOW,
  ],
  [AppointmentStatusEnum.COMPLETED]: [],
  [AppointmentStatusEnum.CANCELLED]: [],
  [AppointmentStatusEnum.NO_SHOW]: [],
};

export class AppointmentStatus {
  private constructor(public readonly value: AppointmentStatusEnum) {}

  static initial(): AppointmentStatus {
    return new AppointmentStatus(AppointmentStatusEnum.SCHEDULED);
  }

  static fromString(value: string): AppointmentStatus {
    const enumValue = value as AppointmentStatusEnum;
    if (!Object.values(AppointmentStatusEnum).includes(enumValue)) {
      throw new Error(`Unknown appointment status: ${value}`);
    }
    return new AppointmentStatus(enumValue);
  }

  canTransitionTo(next: AppointmentStatusEnum): boolean {
    return ALLOWED_TRANSITIONS[this.value].includes(next);
  }

  transitionTo(next: AppointmentStatusEnum): AppointmentStatus {
    if (!this.canTransitionTo(next)) {
      throw new Error(
        `Invalid status transition: ${this.value} → ${next}. ` +
          `Allowed transitions from ${this.value}: [${ALLOWED_TRANSITIONS[this.value].join(', ')}]`,
      );
    }
    return new AppointmentStatus(next);
  }

  isTerminal(): boolean {
    return ALLOWED_TRANSITIONS[this.value].length === 0;
  }
}
