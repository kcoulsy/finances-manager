"use client";

import { useQuery } from "@tanstack/react-query";
import { getProjectsAction } from "../actions/get-projects.action";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const result = await getProjectsAction();
      
      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.projects;
      }

      throw new Error("Failed to fetch projects");
    },
  });
}

