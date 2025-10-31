/**
 * Permission constants organized by feature/resource
 * Avoid magic strings by importing from here
 */
export const Permission = {
  Project: {
    ALL: "project:all",
    CREATE: "project:create",
    READ: "project:read",
    UPDATE: "project:update",
    DELETE: "project:delete",
    MANAGE_MEMBERS: "project:manage_members",
  },
  User: {
    ALL: "user:all",
    CREATE: "user:create",
    READ: "user:read",
    UPDATE: "user:update",
    DELETE: "user:delete",
    MANAGE_ROLES: "user:manage_roles",
  },
  Admin: {
    ALL: "admin:all",
    MANAGE_SYSTEM: "admin:manage_system",
    VIEW_ANALYTICS: "admin:view_analytics",
    USERS: {
      VIEW_ALL: "admin.users.viewAll",
      VIEW_SINGLE: "admin.users.viewSingle",
      UPDATE_ROLES: "admin.users.updateRoles",
      VERIFY: "admin.users.verify",
    },
  },
} as const;

export type PermissionType =
  | (typeof Permission.Project)[keyof typeof Permission.Project]
  | (typeof Permission.User)[keyof typeof Permission.User]
  | (typeof Permission.Admin)[keyof typeof Permission.Admin]
  | (typeof Permission.Admin.USERS)[keyof typeof Permission.Admin.USERS];

/**
 * Maps roles to their permissions
 * This defines which permissions each role has
 */
export const ROLE_PERMISSIONS: Record<string, PermissionType[]> = {
  ADMIN: [
    Permission.Admin.ALL,
    Permission.Admin.USERS.VIEW_ALL,
    Permission.Admin.USERS.VIEW_SINGLE,
    Permission.Admin.USERS.UPDATE_ROLES,
    Permission.Admin.USERS.VERIFY,
    Permission.Project.ALL,
    Permission.User.ALL,
  ],
  MODERATOR: [
    Permission.Project.READ,
    Permission.Project.UPDATE,
    Permission.User.READ,
  ],
  USER: [
    Permission.Project.READ,
    Permission.User.READ,
  ],
};

