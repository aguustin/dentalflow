import { CustomerEntity } from '../../domain/entities/customer.entity';

interface CustomerRow {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentId: string | null;
  attributes: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomerMapper {
  static toDomain(row: CustomerRow): CustomerEntity {
    return CustomerEntity.create({
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      documentId: row.documentId,
      attributes: (row.attributes ?? {}) as Record<string, unknown>,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
