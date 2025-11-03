"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { inviteProjectUserAction } from "../actions/invite-project-user.action";
import type { InviteProjectUserInput } from "../schemas/project-user.schema";

export function useInviteProjectUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InviteProjectUserInput) => {
      const result = await inviteProjectUserAction(input);
      // Handle toast display
      if (result?.serverError) {
        // Error toast shown automatically by toast middleware
      } else if (result?.data?.toast) {
        const { message, type = "success", description } = result.data.toast;
        const options = description ? { description } : {};
        if (type === "success") {
          toast.success(message, options);
        } else if (type === "error") {
          toast.error(message, options);
        } else if (type === "info") {
          toast.info(message, options);
        } else if (type === "warning") {
          toast.warning(message, options);
        }
      }
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project-users", variables.projectId],
      });
    },
  });
}
