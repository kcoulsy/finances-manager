import { z } from "zod";
import { UserRole } from "@/features/auth/constants/roles";

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

export type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;
export type GetUserInput = z.infer<typeof getUserSchema>;
export type VerifyUserInput = z.infer<typeof verifyUserSchema>;
