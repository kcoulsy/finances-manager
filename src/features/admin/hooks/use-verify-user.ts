"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { verifyUserAction } from "../actions/verify-user.action";

export function useVerifyUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const result = await verifyUserAction({ userId });
      
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

