/**
 * Project-level permission constants organized by feature/resource
 * These define what actions a user can perform on a specific project
 * Unlike site-wide permissions, these are scoped to individual projects
 */
export const ProjectPermission = {
  /**
   * Base project roles
   */
  OWNER: "project:owner",
  MEMBER: "project:member",
  INVITED: "project:invited",
  NONE: "project:none",
  /**
   * Project details
   */
  Details: {
    VIEW: "project.details.view",
    UPDATE: "project.details.update",
  },
  /**
   * Project users
   */
  Users: {
    VIEW: "project.users.view",
    INVITE: "project.users.invite",
    REMOVE: "project.users.remove",
    CANCEL_INVITATION: "project.users.cancelInvitation",
  },
  /**
   * Project management
   */
  Project: {
    DELETE: "project.project.delete",
  },
} as const;

export type ProjectPermissionType =
  | typeof ProjectPermission.OWNER
  | typeof ProjectPermission.MEMBER
  | typeof ProjectPermission.INVITED
  | typeof ProjectPermission.NONE
  | (typeof ProjectPermission.Details)[keyof typeof ProjectPermission.Details]
  | (typeof ProjectPermission.Users)[keyof typeof ProjectPermission.Users]
  | (typeof ProjectPermission.Project)[keyof typeof ProjectPermission.Project];

/**
 * Permission descriptions for display in UI
 */
export const PROJECT_PERMISSION_DESCRIPTIONS: Record<
  ProjectPermissionType,
  string
> = {
  [ProjectPermission.OWNER]:
    "Project owner - has all permissions on this project",
  [ProjectPermission.MEMBER]:
    "Project member - can view and participate in the project",
  [ProjectPermission.INVITED]:
    "Invited user - has a pending invitation to join the project",
  [ProjectPermission.NONE]: "No access to this project",
  [ProjectPermission.Details.VIEW]: "User can view project details",
  [ProjectPermission.Details.UPDATE]: "User can update project title",
  [ProjectPermission.Users.VIEW]: "User can see other users",
  [ProjectPermission.Users.INVITE]: "User can invite other users",
  [ProjectPermission.Users.REMOVE]: "User can remove other users",
  [ProjectPermission.Users.CANCEL_INVITATION]:
    "User can cancel pending invitations",
  [ProjectPermission.Project.DELETE]: "User can delete the project",
};

/**
 * Permission categories for organized display
 */
export interface PermissionCategory {
  name: string;
  permissions: ProjectPermissionType[];
}

export const PROJECT_PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: "Users",
    permissions: [
      ProjectPermission.Users.VIEW,
      ProjectPermission.Users.INVITE,
      ProjectPermission.Users.REMOVE,
      ProjectPermission.Users.CANCEL_INVITATION,
    ],
  },
  {
    name: "Details",
    permissions: [
      ProjectPermission.Details.VIEW,
      ProjectPermission.Details.UPDATE,
    ],
  },
  {
    name: "Project",
    permissions: [ProjectPermission.Project.DELETE],
  },
];

/**
 * Maps project roles to their permissions
 * This defines which permissions each role has
 */
export const PROJECT_ROLE_PERMISSIONS: Record<
  "OWNER" | "MEMBER" | "INVITED" | "NONE",
  ProjectPermissionType[]
> = {
  OWNER: [
    ProjectPermission.OWNER,
    ProjectPermission.MEMBER,
    ProjectPermission.Details.VIEW,
    ProjectPermission.Details.UPDATE,
    ProjectPermission.Project.DELETE,
    ProjectPermission.Users.VIEW,
    ProjectPermission.Users.INVITE,
    ProjectPermission.Users.REMOVE,
    ProjectPermission.Users.CANCEL_INVITATION,
  ],
  MEMBER: [
    ProjectPermission.MEMBER,
    ProjectPermission.Details.VIEW,
    ProjectPermission.Users.VIEW,
  ],
  INVITED: [ProjectPermission.INVITED, ProjectPermission.Details.VIEW],
  NONE: [ProjectPermission.NONE],
};
