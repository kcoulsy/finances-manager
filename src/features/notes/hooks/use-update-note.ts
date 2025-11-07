"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";
import { updateNoteAction } from "../actions/update-note.action";
import type { UpdateNoteInput } from "../schemas/note.schema";

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateNoteInput) => {
      const result = await updateNoteAction(data);

      showToastFromAction(result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.note;
      }

      throw new Error("Failed to update note");
    },
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note", note.id] });
      if (note.projectId) {
        queryClient.invalidateQueries({
          queryKey: ["notes", { projectId: note.projectId }],
        });
      }
    },
  });
}

