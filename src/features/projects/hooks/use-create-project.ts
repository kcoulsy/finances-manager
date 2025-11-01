"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createProjectAction } from "../actions/create-project.action";
import type { CreateProjectInput } from "../schemas/project.schema";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";

export function useCreateProject() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const result = await createProjectAction(data);

      // Show toast from action result (handles both errors and success toasts)
      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.project;
      }

      throw new Error("Failed to create project");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push("/projects");
    },
  });
}
