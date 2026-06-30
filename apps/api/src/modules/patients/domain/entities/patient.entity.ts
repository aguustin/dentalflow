import { PatientName } from '../value-objects/patient-name.vo';
import { ContactInfo } from '../value-objects/contact-info.vo';

export interface CreatePatientProps {
  id: string;
  organizationId: string;
  name: string | PatientName;
  email?: string | null;
  phone?: string | null;
  documentId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PatientEntity {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly name: PatientName;
  public readonly contact: ContactInfo;
  public readonly documentId: string | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: {
    id: string;
    organizationId: string;
    name: PatientName;
    contact: ContactInfo;
    documentId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.name = props.name;
    this.contact = props.contact;
    this.documentId = props.documentId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreatePatientProps): PatientEntity {
    const name =
      props.name instanceof PatientName ? props.name : PatientName.create(props.name);
    const contact = ContactInfo.create(props.email, props.phone);

    return new PatientEntity({
      id: props.id,
      organizationId: props.organizationId,
      name,
      contact,
      documentId: props.documentId?.trim() || null,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    });
  }
}
