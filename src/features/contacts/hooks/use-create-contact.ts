"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";
import { createContactAction } from "../actions/create-contact.action";
import type { CreateContactInput } from "../schemas/contact.schema";

export function useCreateContact() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: CreateContactInput) => {
      const result = await createContactAction(data);

      // Show toast from action result (handles both errors and success toasts)
      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.contact;
      }

      throw new Error("Failed to create contact");
    },
    onSuccess: (contact) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      router.push(`/contacts/${contact.id}`);
    },
  });
}
