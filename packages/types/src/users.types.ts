/** Organization members and roles. */

export interface Member {
  membershipId: string
  userId: string
  email: string
  firstName: string
  lastName: string
  roleId: string
  roleName: string
  isActive: boolean
  joinedAt: string
}

export interface Role {
  id: string
  name: string
}
