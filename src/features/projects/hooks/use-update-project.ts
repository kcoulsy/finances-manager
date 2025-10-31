"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { updateProjectAction } from "../actions/update-project.action";
import type { UpdateProjectInput } from "../schemas/project.schema";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: UpdateProjectInput) => {
      const result = await updateProjectAction(data);

      // Show toast from action result (handles both errors and success toasts)
      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.project;
      }

      throw new Error("Failed to update project");
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      router.push(`/projects/${project.id}`);
    },
  });
}

