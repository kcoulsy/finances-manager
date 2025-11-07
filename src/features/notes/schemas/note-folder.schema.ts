import { z } from "zod";

export const createNoteFolderSchema = z.object({
  name: z
    .string()
    .min(1, "Folder name is required")
    .max(100, "Folder name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  parentId: z.string().optional().nullable(),
  projectId: z.string().optional(),
  context: z.enum(["project", "global"]).default("project"),
});

export const updateNoteFolderSchema = z.object({
  folderId: z.string().min(1, "Folder ID is required"),
  name: z
    .string()
    .min(1, "Folder name is required")
    .max(100, "Folder name must be less than 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional()
    .nullable(),
  parentId: z.string().optional().nullable(),
});

export const getNoteFolderSchema = z.object({
  folderId: z.string().min(1, "Folder ID is required"),
});

export const deleteNoteFolderSchema = z.object({
  folderId: z.string().min(1, "Folder ID is required"),
  includeNotes: z.boolean().default(false), // If true, soft delete all notes; if false, move notes to parent folder
});

export const getNoteFoldersSchema = z.object({
  projectId: z.string().optional(),
  context: z.enum(["project", "global"]).optional(),
  parentId: z.string().optional().nullable(),
});

export type CreateNoteFolderInput = z.infer<typeof createNoteFolderSchema>;
export type UpdateNoteFolderInput = z.infer<typeof updateNoteFolderSchema>;
export type GetNoteFolderInput = z.infer<typeof getNoteFolderSchema>;
export type DeleteNoteFolderInput = z.infer<typeof deleteNoteFolderSchema>;
export type GetNoteFoldersInput = z.infer<typeof getNoteFoldersSchema>;
