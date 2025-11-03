"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { updateContactAction } from "../actions/update-contact.action";
import type { UpdateContactInput } from "../schemas/contact.schema";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: UpdateContactInput) => {
      const result = await updateContactAction(data);

      // Show toast from action result (handles both errors and success toasts)
      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.contact;
      }

      throw new Error("Failed to update contact");
    },
    onSuccess: (contact) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
      router.push(`/contacts/${contact.id}`);
    },
  });
}
