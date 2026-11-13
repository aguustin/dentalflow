import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import {
  ICustomerRepository,
  FindCustomersOptions,
  CreateCustomerData,
  UpdateCustomerData,
} from '../../domain/repositories/customer.repository.interface';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { CustomerMapper } from '../mappers/customer.mapper';

@Injectable()
export class CustomerPrismaRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, organizationId: string): Promise<CustomerEntity | null> {
    const row = await this.prisma.customer.findFirst({ where: { id, organizationId } });
    return row ? CustomerMapper.toDomain(row) : null;
  }

  async findAll(
    organizationId: string,
    options?: FindCustomersOptions,
  ): Promise<{ items: CustomerEntity[]; total: number }> {
    const limit = Math.min(options?.limit ?? 20, 100);
    const offset = options?.offset ?? 0;
    const where = {
      organizationId,
      ...(options?.name
        ? { name: { contains: options.name, mode: 'insensitive' as const } }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { name: 'asc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items: rows.map(CustomerMapper.toDomain), total };
  }

  async findByDocumentId(documentId: string, organizationId: string): Promise<CustomerEntity | null> {
    const row = await this.prisma.customer.findFirst({ where: { documentId, organizationId } });
    return row ? CustomerMapper.toDomain(row) : null;
  }

  async create(data: CreateCustomerData): Promise<CustomerEntity> {
    const row = await this.prisma.customer.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        documentId: data.documentId ?? null,
        attributes: (data.attributes ?? {}) as Prisma.InputJsonObject,
      },
    });
    return CustomerMapper.toDomain(row);
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateCustomerData,
  ): Promise<CustomerEntity | null> {
    return this.prisma.$transaction(async (tx) => {
      const exists = await tx.customer.findFirst({ where: { id, organizationId } });
      if (!exists) return null;

      const row = await tx.customer.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.documentId !== undefined && { documentId: data.documentId }),
          ...(data.attributes !== undefined && {
            attributes: data.attributes as Prisma.InputJsonObject,
          }),
        },
      });
      return CustomerMapper.toDomain(row);
    });
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.prisma.customer.deleteMany({ where: { id, organizationId } });
  }
}
