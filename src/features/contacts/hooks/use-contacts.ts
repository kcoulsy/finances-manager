"use client";

import { useQuery } from "@tanstack/react-query";
import { listContactsAction } from "../actions/list-contacts.action";
import type { ListContactsInput } from "../schemas/contact.schema";

export function useContacts(input?: ListContactsInput) {
  return useQuery({
    queryKey: ["contacts", input],
    queryFn: async () => {
      const result = await listContactsAction(input || {});

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data;
      }

      throw new Error("Failed to fetch contacts");
    },
  });
}

