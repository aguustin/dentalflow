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
}
