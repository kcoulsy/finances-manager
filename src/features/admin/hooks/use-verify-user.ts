"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyUserAction } from "../actions/verify-user.action";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";

export function useVerifyUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const result = await verifyUserAction({ userId });

      // Show toast from action result (handles both errors and success toasts)
      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.user;
      }

      throw new Error("Failed to verify user");
    },
    onSuccess: (data, userId) => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ["users"] });
      // Invalidate and refetch the specific user
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
    },
  });
}
