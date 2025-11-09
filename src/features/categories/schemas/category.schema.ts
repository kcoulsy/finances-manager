import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const updateCategorySchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  name: z.string().min(1, "Category name is required").optional(),
  color: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
});

export const deleteCategorySchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
});

export const getCategoriesSchema = z.object({});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
export type GetCategoriesInput = z.infer<typeof getCategoriesSchema>;

