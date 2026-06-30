export class TimeRange {
  private constructor(
    public readonly startTime: Date,
    public readonly endTime: Date,
  ) {}

  static create(startTime: Date, endTime: Date): TimeRange {
    if (!(startTime instanceof Date) || isNaN(startTime.getTime())) {
      throw new Error('Invalid start time');
    }
    if (!(endTime instanceof Date) || isNaN(endTime.getTime())) {
      throw new Error('Invalid end time');
    }
    if (startTime >= endTime) {
      throw new Error('Start time must be strictly before end time');
    }
    return new TimeRange(startTime, endTime);
  }

  getDurationMinutes(): number {
    return (this.endTime.getTime() - this.startTime.getTime()) / 60_000;
  }

  overlaps(other: TimeRange): boolean {
    return this.startTime < other.endTime && this.endTime > other.startTime;
  }
}
