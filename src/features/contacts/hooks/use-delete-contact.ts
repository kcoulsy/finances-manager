"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteContactAction } from "../actions/delete-contact.action";
import type { DeleteContactInput } from "../schemas/contact.schema";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteContactInput) => {
      const result = await deleteContactAction(data);

      // Show toast from action result (handles both errors and success toasts)
      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data;
      }

      throw new Error("Failed to delete contact");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      // Don't redirect if we're already on the contacts list
    },
  });
}
