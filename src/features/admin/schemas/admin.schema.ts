import { z } from "zod";

export const updateUserRolesSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  roleIds: z.array(z.string()).min(1, "At least one role is required"),
});

export const getUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const verifyUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const getUsersSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  role: z.string().optional(),
  emailVerified: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;
export type GetUserInput = z.infer<typeof getUserSchema>;
export type VerifyUserInput = z.infer<typeof verifyUserSchema>;
export type GetUsersInput = z.infer<typeof getUsersSchema>;
