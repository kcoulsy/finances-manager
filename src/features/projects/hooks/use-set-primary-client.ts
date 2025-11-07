"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";
import { setPrimaryClientAction } from "../actions/set-primary-client.action";
import type { SetPrimaryClientInput } from "../schemas/project-user.schema";

export function useSetPrimaryClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SetPrimaryClientInput) => {
      const result = await setPrimaryClientAction(data);

      // Show toast from action result (handles both errors and success toasts)
      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data;
      }

      throw new Error("Failed to set primary client");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["project-users", variables.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project", variables.projectId],
      });
    },
  });
}


