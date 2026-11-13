import { CustomerName } from '../value-objects/customer-name.vo';
import { ContactInfo } from '../value-objects/contact-info.vo';

export interface CreateCustomerProps {
  id: string;
  organizationId: string;
  name: string | CustomerName;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
  attributes?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CustomerEntity {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly name: CustomerName;
  public readonly contact: ContactInfo;
  public readonly documentId: string | null;
  /** Vertical-specific fields (validated in the application layer) */
  public readonly attributes: Record<string, unknown>;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: {
    id: string;
    organizationId: string;
    name: CustomerName;
    contact: ContactInfo;
    documentId: string | null;
    attributes: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.name = props.name;
    this.contact = props.contact;
    this.documentId = props.documentId;
    this.attributes = props.attributes;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreateCustomerProps): CustomerEntity {
    const name =
      props.name instanceof CustomerName ? props.name : CustomerName.create(props.name);
    const contact = ContactInfo.create(props.email, props.phone);

    return new CustomerEntity({
      id: props.id,
      organizationId: props.organizationId,
      name,
      contact,
      documentId: props.documentId?.trim() || null,
      attributes: props.attributes ?? {},
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }
}
