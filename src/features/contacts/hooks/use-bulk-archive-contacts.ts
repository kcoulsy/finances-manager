"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkArchiveContactsAction } from "../actions/bulk-archive-contacts.action";
import type { BulkArchiveContactsInput } from "../schemas/contact.schema";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";

export function useBulkArchiveContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkArchiveContactsInput) => {
      const result = await bulkArchiveContactsAction(data);

      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data;
      }

      throw new Error("Failed to archive contacts");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
