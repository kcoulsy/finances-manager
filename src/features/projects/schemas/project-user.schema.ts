import { z } from "zod";

export const projectUserTypeSchema = z.enum([
  "Client",
  "Contractor",
  "Employee",
  "Legal",
]);

export const inviteProjectUserSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  email: z.string().email("Invalid email address"),
  userType: projectUserTypeSchema,
});

export const listProjectUsersSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

export const removeProjectUserSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
});

export const listPendingInvitationsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

export const cancelInvitationSchema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required"),
});

export const setPrimaryClientSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  userId: z.string().min(1, "User ID is required").optional(),
});

export type InviteProjectUserInput = z.infer<typeof inviteProjectUserSchema>;
export type ListProjectUsersInput = z.infer<typeof listProjectUsersSchema>;
export type RemoveProjectUserInput = z.infer<typeof removeProjectUserSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type ListPendingInvitationsInput = z.infer<
  typeof listPendingInvitationsSchema
>;
export type CancelInvitationInput = z.infer<typeof cancelInvitationSchema>;
export type SetPrimaryClientInput = z.infer<typeof setPrimaryClientSchema>;
