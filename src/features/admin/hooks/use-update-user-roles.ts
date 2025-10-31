"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserRolesAction } from "../actions/update-user-roles.action";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";

export function useUpdateUserRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { userId: string; roleIds: string[] }) => {
      const result = await updateUserRolesAction(data);

      // Show toast from action result (handles both errors and success toasts)
      showToastFromAction(result);
      
      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.user;
      }

      throw new Error("Failed to update user roles");
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ["users"] });
      // Invalidate and refetch the specific user
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
    },
  });
}

