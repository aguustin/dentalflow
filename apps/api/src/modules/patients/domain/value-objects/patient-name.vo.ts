export class PatientName {
  private constructor(private readonly value: string) {}

  static create(name: string): PatientName {
    const trimmed = name?.trim();
    if (!trimmed || trimmed.length < 2) {
      throw new Error('Patient name must be at least 2 characters');
    }
    if (trimmed.length > 200) {
      throw new Error('Patient name cannot exceed 200 characters');
    }
    return new PatientName(trimmed);
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
