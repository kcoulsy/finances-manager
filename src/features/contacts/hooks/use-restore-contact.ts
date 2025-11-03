"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";
import { restoreContactAction } from "../actions/restore-contact.action";
import type { GetContactInput } from "../schemas/contact.schema";

export function useRestoreContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GetContactInput) => {
      const result = await restoreContactAction(data);

      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data;
      }

      throw new Error("Failed to restore contact");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
