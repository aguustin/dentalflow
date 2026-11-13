export interface ICustomerExistenceChecker {
  existsInOrganization(customerId: string, organizationId: string): Promise<boolean>;
  /** Display names by customer id (read-only, for listings). Missing ids are omitted. */
  findNames(customerIds: string[], organizationId: string): Promise<Map<string, string>>;
}
