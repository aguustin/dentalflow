import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DomainError } from '../../shared/contracts/errors/domain.error';
import { getVertical, validateAttributes } from '../../shared/verticals';
import { ToothEntry, validateToothEntries } from './domain/odontogram';

interface CurrentToothRow {
  tooth: number;
  surface: string | null;
  condition: string;
  notes: string | null;
  created_at: Date;
}

/**
 * Clinical record of a customer (patient): anamnesis, progress notes and odontogram.
 * Health data — access is restricted by the clinical.* permissions.
 */
@Injectable()
export class ClinicalService {
  constructor(private readonly prisma: PrismaService) {}

  async get(customerId: string, organizationId: string) {
    const customer = await this.customer(customerId, organizationId);
    const [record, notes, odontogram] = await Promise.all([
      this.prisma.clinicalRecord.findUnique({ where: { customerId } }),
      this.notes(customerId, organizationId, { limit: 50, offset: 0 }),
      this.odontogram(customerId, organizationId),
    ]);
    return {
      customer,
      anamnesis: (record?.anamnesis ?? {}) as Record<string, unknown>,
      anamnesisUpdatedAt: record?.updatedAt ?? null,
      notes,
      odontogram,
    };
  }

  async updateAnamnesis(customerId: string, organizationId: string, userId: string, input: unknown) {
    await this.customer(customerId, organizationId);
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { vertical: true },
    });
    const fields = getVertical(org.vertical).clinical?.anamnesisFields;
    if (!fields) throw new DomainError('INVALID', 'This business vertical has no clinical record');
    const anamnesis = validateAttributes(fields, input) as Prisma.InputJsonObject;

    await this.prisma.clinicalRecord.upsert({
      where: { customerId },
      create: { organizationId, customerId, anamnesis, updatedBy: userId },
      update: { anamnesis, updatedBy: userId },
    });
    return this.get(customerId, organizationId);
  }

  /** Paginated notes of a customer of this organization (404 otherwise). */
  async listNotes(customerId: string, organizationId: string, page: { limit: number; offset: number }) {
    await this.customer(customerId, organizationId);
    return this.notes(customerId, organizationId, page);
  }

  private async notes(customerId: string, organizationId: string, page: { limit: number; offset: number }) {
    const where = { customerId, organizationId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.clinicalNote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(page.limit, 100),
        skip: page.offset,
        select: { id: true, authorName: true, content: true, createdAt: true },
      }),
      this.prisma.clinicalNote.count({ where }),
    ]);
    return { items, total };
  }

  async addNote(customerId: string, organizationId: string, userId: string, content: string) {
    await this.customer(customerId, organizationId);
    const author = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    return this.prisma.clinicalNote.create({
      data: {
        organizationId,
        customerId,
        authorId: userId,
        authorName: `${author.firstName} ${author.lastName}`.trim(),
        content: content.trim(),
      },
      select: { id: true, authorName: true, content: true, createdAt: true },
    });
  }

  /** Records a batch of tooth conditions and returns the updated current odontogram. */
  async recordTeeth(customerId: string, organizationId: string, userId: string, entries: ToothEntry[]) {
    await this.customer(customerId, organizationId);
    validateToothEntries(entries);
    await this.prisma.toothCondition.createMany({
      data: entries.map((e) => ({
        organizationId,
        customerId,
        tooth: e.tooth,
        surface: e.surface,
        condition: e.condition,
        notes: e.notes?.trim() || null,
        recordedBy: userId,
      })),
    });
    return this.odontogram(customerId, organizationId);
  }

  /** Current state: latest entry per tooth + surface, excluding cleared (HEALTHY) ones. */
  async odontogram(customerId: string, organizationId: string) {
    const rows = await this.prisma.$queryRaw<CurrentToothRow[]>`
      SELECT DISTINCT ON ("tooth", COALESCE("surface", ''))
        "tooth", "surface", "condition", "notes", "created_at"
      FROM "tooth_conditions"
      WHERE "customer_id" = ${customerId} AND "organization_id" = ${organizationId}
      ORDER BY "tooth", COALESCE("surface", ''), "created_at" DESC`;
    return rows
      .filter((r) => r.condition !== 'HEALTHY')
      .map((r) => ({
        tooth: r.tooth,
        surface: r.surface,
        condition: r.condition,
        notes: r.notes,
        recordedAt: r.created_at,
      }));
  }

  async history(customerId: string, organizationId: string, tooth?: number) {
    await this.customer(customerId, organizationId);
    return this.prisma.toothCondition.findMany({
      where: { customerId, organizationId, ...(tooth && { tooth }) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, tooth: true, surface: true, condition: true, notes: true, createdAt: true },
    });
  }

  private async customer(customerId: string, organizationId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId },
      select: { id: true, name: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
}
