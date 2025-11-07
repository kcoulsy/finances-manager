import { z } from "zod";

export const notePrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export const noteStatusSchema = z.enum(["ACTIVE", "ARCHIVED", "DELETED"]);
export const noteCategoryColorSchema = z.enum([
  "GRAY",
  "RED",
  "BLUE",
  "TEAL",
  "AMBER",
  "GREEN",
  "PURPLE",
  "SLATE",
  "ORANGE",
  "CYAN",
  "INDIGO",
  "PINK",
]);

export const noteLinkSchema = z.object({
  linkType: z.enum(["Contact", "Project"]),
  linkId: z.string().min(1, "Link ID is required"),
});

export const createNoteSchema = z.object({
  title: z
    .string()
    .max(200, "Title must be less than 200 characters")
    .optional(),
  content: z
    .string()
    .min(1, "Content is required")
    .max(4000, "Content must be less than 4000 characters"),
  priority: notePrioritySchema.default("NORMAL"),
  status: noteStatusSchema.default("ACTIVE"),
  categoryId: z.string().optional(),
  folderId: z.string().optional(),
  // Legacy fields - kept for backward compatibility
  projectId: z.string().optional(),
  contactId: z.string().optional(),
  notableType: z.enum(["Contact", "Project"]).optional(),
  notableId: z.string().optional(),
  // New flexible linking system
  links: z.array(noteLinkSchema).optional().default([]),
});

export const updateNoteSchema = z.object({
  noteId: z.string().min(1, "Note ID is required"),
  title: z
    .string()
    .max(200, "Title must be less than 200 characters")
    .optional(),
  content: z
    .string()
    .min(1, "Content is required")
    .max(4000, "Content must be less than 4000 characters"),
  priority: notePrioritySchema.optional(),
  status: noteStatusSchema.optional(),
  categoryId: z.string().optional().nullable(),
  folderId: z.string().optional().nullable(),
  // New flexible linking system
  links: z.array(noteLinkSchema).optional(),
});

export const getNoteSchema = z.object({
  noteId: z.string().min(1, "Note ID is required"),
});

export const deleteNoteSchema = z.object({
  noteId: z.string().min(1, "Note ID is required"),
});

export const restoreNoteSchema = z.object({
  noteId: z.string().min(1, "Note ID is required"),
});

export const getNotesSchema = z.object({
  projectId: z.string().optional(),
  folderId: z.string().optional(),
  categoryId: z.string().optional(),
  contactId: z.string().optional(),
  search: z.string().optional(),
  priority: notePrioritySchema.optional(),
  status: noteStatusSchema.optional(),
  sortBy: z
    .enum(["created_at", "updated_at", "priority"])
    .default("updated_at"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  includeDeleted: z.boolean().default(false),
});

export const bulkDeleteNotesSchema = z.object({
  noteIds: z.array(z.string()).min(1, "At least one note ID is required"),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type GetNoteInput = z.infer<typeof getNoteSchema>;
export type DeleteNoteInput = z.infer<typeof deleteNoteSchema>;
export type RestoreNoteInput = z.infer<typeof restoreNoteSchema>;
export type GetNotesInput = z.infer<typeof getNotesSchema>;
export type BulkDeleteNotesInput = z.infer<typeof bulkDeleteNotesSchema>;
export type NoteLinkInput = z.infer<typeof noteLinkSchema>;
