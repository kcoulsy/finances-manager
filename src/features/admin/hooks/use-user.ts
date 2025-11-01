"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserAction } from "../actions/get-user.action";

export function useUser(userId: string) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const result = await getUserAction({ userId });

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.user;
      }

      throw new Error("Failed to fetch user");
    },
    enabled: !!userId,
  });
}
