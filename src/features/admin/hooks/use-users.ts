"use client";

import { useQuery } from "@tanstack/react-query";
import { getUsersAction } from "../actions/get-users.action";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const result = await getUsersAction();
      
      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.users;
      }

      throw new Error("Failed to fetch users");
    },
  });
}

