import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
});

export const updateProjectSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
});

export const getProjectSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
});

export const deleteProjectSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type GetProjectInput = z.infer<typeof getProjectSchema>;
export type DeleteProjectInput = z.infer<typeof deleteProjectSchema>;
