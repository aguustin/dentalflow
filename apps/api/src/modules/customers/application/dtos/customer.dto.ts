import { CustomerEntity } from '../../domain/entities/customer.entity';

export interface CustomerDto {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  documentId: string | null;
  attributes: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerCommand {
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
  /** Full replacement of vertical-specific attributes */
  attributes?: Record<string, unknown>;
}

export interface UpdateCustomerCommand {
  name?: string;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
  /** Full replacement of vertical-specific attributes */
  attributes?: Record<string, unknown>;
}

export interface ListCustomersFilters {
  name?: string;
  limit?: number;
  offset?: number;
}

export interface ListCustomersResult {
  items: CustomerDto[];
  total: number;
  limit: number;
  offset: number;
}

export function toCustomerDto(entity: CustomerEntity): CustomerDto {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    name: entity.name.getValue(),
    email: entity.contact.email,
    phone: entity.contact.phone,
    documentId: entity.documentId,
    attributes: entity.attributes,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
