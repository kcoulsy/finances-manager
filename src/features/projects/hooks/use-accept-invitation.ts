"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { handleActionWithToast } from "@/features/shared/lib/actions/toast";
import { acceptInvitationAction } from "../actions/accept-invitation.action";
import type { AcceptInvitationInput } from "../schemas/project-user.schema";

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: AcceptInvitationInput) => {
      const result = await acceptInvitationAction(input);
      handleActionWithToast(result);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["pending-invitations"],
      });
      if (result?.data?.project?.id) {
        router.push(`/projects/${result.data.project.id}`);
        router.refresh();
      }
    },
  });
}
