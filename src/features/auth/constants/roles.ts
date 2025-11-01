/**
 * User roles enum-like constants
 * Roles are hard-coded and stored in the database
 */
export const UserRole = {
  ADMIN: "ADMIN",
  USER: "USER",
  MODERATOR: "MODERATOR",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];
