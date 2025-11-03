/**
 * Project user type constants
 * These define the roles a user can have within a specific project
 */
export const ProjectUserType = {
  CLIENT: "Client",
  CONTRACTOR: "Contractor",
  EMPLOYEE: "Employee",
  LEGAL: "Legal",
} as const;

export type ProjectUserTypeType =
  (typeof ProjectUserType)[keyof typeof ProjectUserType];
