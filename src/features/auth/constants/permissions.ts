/**
 * Permission constants organized by feature/resource
 * Avoid magic strings by importing from here
 */
export const Permission = {
  Project: {
    ALL: "project:all",
    VIEW: "project:view",
    UPDATE: "project:update",
  },
  User: {
    ALL: "user:all",
    VIEW: "user:view",
  },
  Admin: {
    ALL: "admin:all",
    VIEW_OWN: "admin:viewOwn",
    VIEW_ANY: "admin:viewAny",
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
    Permission.Admin.VIEW_OWN,
    Permission.Admin.VIEW_ANY,
    Permission.Admin.USERS.VIEW_ALL,
    Permission.Admin.USERS.VIEW_SINGLE,
    Permission.Admin.USERS.UPDATE_ROLES,
    Permission.Admin.USERS.VERIFY,
    Permission.Project.ALL,
    Permission.User.ALL,
  ],
  MODERATOR: [
    Permission.Project.VIEW,
    Permission.Project.UPDATE,
    Permission.User.VIEW,
  ],
  USER: [
    Permission.Project.VIEW,
    Permission.Project.UPDATE,
    Permission.User.VIEW,
  ],
};
