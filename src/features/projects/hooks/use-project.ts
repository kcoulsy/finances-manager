"use client";

import { useQuery } from "@tanstack/react-query";
import { getProjectAction } from "../actions/get-project.action";

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const result = await getProjectAction({ projectId });

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.project;
      }

      throw new Error("Failed to fetch project");
    },
    enabled: !!projectId,
  });
}
