import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ICustomerExistenceChecker } from '../../application/services/customer-existence-checker.interface';

@Injectable()
export class PrismaCustomerExistenceChecker implements ICustomerExistenceChecker {
  constructor(private readonly prisma: PrismaService) {}

  async existsInOrganization(customerId: string, organizationId: string): Promise<boolean> {
    const count = await this.prisma.customer.count({
      where: { id: customerId, organizationId },
    });
    return count > 0;
  }

  async findNames(customerIds: string[], organizationId: string): Promise<Map<string, string>> {
    if (customerIds.length === 0) return new Map();
    const rows = await this.prisma.customer.findMany({
      where: { id: { in: [...new Set(customerIds)] }, organizationId },
      select: { id: true, name: true },
    });
    return new Map(rows.map((r) => [r.id, r.name]));
  }
}
