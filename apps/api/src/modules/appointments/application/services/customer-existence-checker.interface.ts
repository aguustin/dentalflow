export interface ICustomerExistenceChecker {
  existsInOrganization(customerId: string, organizationId: string): Promise<boolean>;
}
