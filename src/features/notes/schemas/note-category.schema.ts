import { z } from "zod";
import { noteCategoryColorSchema } from "./note.schema";

export const createNoteCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be less than 100 characters"),
  color: noteCategoryColorSchema.default("GRAY"),
});

export const updateNoteCategorySchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be less than 100 characters")
    .optional(),
  color: noteCategoryColorSchema.optional(),
});

export const getNoteCategorySchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
});

export const deleteNoteCategorySchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
});

export const getNoteCategoriesSchema = z.object({
  projectId: z.string().optional(),
});

export type CreateNoteCategoryInput = z.infer<typeof createNoteCategorySchema>;
export type UpdateNoteCategoryInput = z.infer<typeof updateNoteCategorySchema>;
export type GetNoteCategoryInput = z.infer<typeof getNoteCategorySchema>;
export type DeleteNoteCategoryInput = z.infer<typeof deleteNoteCategorySchema>;
export type GetNoteCategoriesInput = z.infer<typeof getNoteCategoriesSchema>;
