"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserProjectsAction } from "../actions/get-user-projects.action";

export function useUserProjects(userId: string) {
  return useQuery({
    queryKey: ["user-projects", userId],
    queryFn: async () => {
      const result = await getUserProjectsAction({ userId });

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.projects;
      }

      throw new Error("Failed to fetch user projects");
    },
    enabled: !!userId,
  });
}
