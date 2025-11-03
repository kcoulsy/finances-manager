"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { handleActionWithToast } from "@/features/shared/lib/actions/toast";
import { cancelInvitationAction } from "../actions/cancel-invitation.action";
import type { CancelInvitationInput } from "../schemas/project-user.schema";

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CancelInvitationInput) => {
      const result = await cancelInvitationAction(input);
      handleActionWithToast(result);
      return result;
    },
    onSuccess: () => {
      // Invalidate project users queries to refresh the table
      queryClient.invalidateQueries({
        queryKey: ["project-users"],
      });
    },
  });
}
