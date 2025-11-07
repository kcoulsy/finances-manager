"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";
import { updateNoteFolderAction } from "../actions/update-note-folder.action";
import type { UpdateNoteFolderInput } from "../schemas/note-folder.schema";

export function useUpdateNoteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateNoteFolderInput) => {
      const result = await updateNoteFolderAction(data);

      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.folder;
      }

      throw new Error("Failed to update folder");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["note-folders"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      if (variables.folderId) {
        queryClient.invalidateQueries({
          queryKey: ["note-folders", { folderId: variables.folderId }],
        });
      }
    },
  });
}
