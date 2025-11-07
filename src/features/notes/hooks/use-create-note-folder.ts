"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";
import { createNoteFolderAction } from "../actions/create-note-folder.action";
import type { CreateNoteFolderInput } from "../schemas/note-folder.schema";

export function useCreateNoteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNoteFolderInput) => {
      const result = await createNoteFolderAction(data);

      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.folder;
      }

      throw new Error("Failed to create folder");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["note-folders"] });
      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: ["note-folders", { projectId: variables.projectId }],
        });
      }
    },
  });
}

