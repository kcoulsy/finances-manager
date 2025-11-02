"use client";

import { useQuery } from "@tanstack/react-query";
import { getContactAction } from "../actions/get-contact.action";

export function useContact(contactId: string) {
  return useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      const result = await getContactAction({ contactId });

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.contact;
      }

      throw new Error("Failed to fetch contact");
    },
    enabled: !!contactId,
  });
}

