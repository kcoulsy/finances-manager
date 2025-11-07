"use client";

import { useQuery } from "@tanstack/react-query";
import { getNoteCategoriesAction } from "../actions/get-note-categories.action";
import type { GetNoteCategoriesInput } from "../schemas/note-category.schema";

export function useNoteCategories(input: GetNoteCategoriesInput = {}) {
  return useQuery({
    queryKey: ["note-categories", input],
    queryFn: async () => {
      const result = await getNoteCategoriesAction(input);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.categories;
      }

      throw new Error("Failed to fetch categories");
    },
  });
}

