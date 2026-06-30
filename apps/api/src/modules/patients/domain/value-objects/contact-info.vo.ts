export class ContactInfo {
  private constructor(
    public readonly email: string | null,
    public readonly phone: string | null,
  ) {}

  static create(email?: string | null, phone?: string | null): ContactInfo {
    const validatedEmail = email ? ContactInfo.validateEmail(email) : null;
    const cleanPhone = phone?.trim() || null;
    return new ContactInfo(validatedEmail, cleanPhone);
  }

  private static validateEmail(email: string): string {
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new Error(`Invalid email format: ${email}`);
    }
    return trimmed;
  }
}
