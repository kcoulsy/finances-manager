"use client";

import { useQuery } from "@tanstack/react-query";
import { listProjectUsersAction } from "../actions/list-project-users.action";
import type { ListProjectUsersInput } from "../schemas/project-user.schema";

export function useListProjectUsers(input: ListProjectUsersInput) {
  return useQuery({
    queryKey: ["project-users", input.projectId, input.page, input.limit],
    queryFn: async () => {
      const result = await listProjectUsersAction(input);
      if (!result?.data?.success) {
        throw new Error(result?.serverError || "Failed to fetch project users");
      }
      return result.data;
    },
  });
}
