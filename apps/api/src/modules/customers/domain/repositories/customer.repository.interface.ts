import { CustomerEntity } from '../entities/customer.entity';

export interface FindCustomersOptions {
  name?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCustomerData {
  id: string;
  organizationId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
  attributes?: Record<string, unknown>;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
  attributes?: Record<string, unknown>;
}

export interface ICustomerRepository {
  findById(id: string, organizationId: string): Promise<CustomerEntity | null>;
  findAll(
    organizationId: string,
    options?: FindCustomersOptions,
  ): Promise<{ items: CustomerEntity[]; total: number }>;
  findByDocumentId(documentId: string, organizationId: string): Promise<CustomerEntity | null>;
  create(data: CreateCustomerData): Promise<CustomerEntity>;
  update(id: string, organizationId: string, data: UpdateCustomerData): Promise<CustomerEntity | null>;
  delete(id: string, organizationId: string): Promise<void>;
}
