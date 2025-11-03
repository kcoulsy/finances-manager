"use client";

import { useQuery } from "@tanstack/react-query";
import { listPendingInvitationsAction } from "../actions/list-pending-invitations.action";
import type { ListPendingInvitationsInput } from "../schemas/project-user.schema";

export function useListPendingInvitations(input: ListPendingInvitationsInput) {
  return useQuery({
    queryKey: ["pending-invitations", input.page, input.limit],
    queryFn: async () => {
      const result = await listPendingInvitationsAction(input);
      if (!result?.data?.success) {
        throw new Error(result?.serverError || "Failed to fetch invitations");
      }
      return result.data;
    },
  });
}
