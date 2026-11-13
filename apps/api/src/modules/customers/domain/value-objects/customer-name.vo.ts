export class CustomerName {
  private constructor(private readonly value: string) {}

  static create(name: string): CustomerName {
    const trimmed = name?.trim();
    if (!trimmed || trimmed.length < 2) {
      throw new Error('Customer name must be at least 2 characters');
    }
    if (trimmed.length > 200) {
      throw new Error('Customer name cannot exceed 200 characters');
    }
    return new CustomerName(trimmed);
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}
