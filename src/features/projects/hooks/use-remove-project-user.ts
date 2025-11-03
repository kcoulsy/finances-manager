"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { handleActionWithToast } from "@/features/shared/lib/actions/toast";
import { removeProjectUserAction } from "../actions/remove-project-user.action";
import type { RemoveProjectUserInput } from "../schemas/project-user.schema";

export function useRemoveProjectUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RemoveProjectUserInput) => {
      const result = await removeProjectUserAction(input);
      handleActionWithToast(result);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project-users", variables.projectId],
      });
    },
  });
}
