import { useQuery } from "@tanstack/react-query";
import { getCategoriesAction } from "../actions/get-categories.action";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const result = await getCategoriesAction({});
      if (result?.serverError) {
        throw new Error(result.serverError);
      }
      if (!result?.data?.success) {
        throw new Error("Failed to fetch categories");
      }
      return result.data.categories;
    },
  });
}

