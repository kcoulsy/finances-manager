"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkDeleteContactsAction } from "../actions/bulk-delete-contacts.action";
import type { BulkDeleteContactsInput } from "../schemas/contact.schema";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";

export function useBulkDeleteContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkDeleteContactsInput) => {
      const result = await bulkDeleteContactsAction(data);

      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data;
      }

      throw new Error("Failed to delete contacts");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

