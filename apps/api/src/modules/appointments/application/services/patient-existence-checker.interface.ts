export interface IPatientExistenceChecker {
  existsInOrganization(patientId: string, organizationId: string): Promise<boolean>;
}
