"use client";

import { useQuery } from "@tanstack/react-query";
import { getRolesAction } from "../actions/get-roles.action";

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const result = await getRolesAction();

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.roles;
      }

      throw new Error("Failed to fetch roles");
    },
  });
}
