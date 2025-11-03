"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";
import { archiveContactAction } from "../actions/archive-contact.action";
import type { GetContactInput } from "../schemas/contact.schema";

export function useArchiveContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GetContactInput) => {
      const result = await archiveContactAction(data);

      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data;
      }

      throw new Error("Failed to archive contact");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
