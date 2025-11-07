"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";
import { deleteNoteFolderAction } from "../actions/delete-note-folder.action";
import type { DeleteNoteFolderInput } from "../schemas/note-folder.schema";

export function useDeleteNoteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteNoteFolderInput) => {
      const result = await deleteNoteFolderAction(data);

      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data;
      }

      throw new Error("Failed to delete folder");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-folders"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}
