import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { IPatientExistenceChecker } from '../../application/services/patient-existence-checker.interface';

@Injectable()
export class PrismaPatientExistenceChecker implements IPatientExistenceChecker {
  constructor(private readonly prisma: PrismaService) {}

  async existsInOrganization(patientId: string, organizationId: string): Promise<boolean> {
    const count = await this.prisma.patient.count({
      where: { id: patientId, organizationId },
    });
    return count > 0;
  }
}
