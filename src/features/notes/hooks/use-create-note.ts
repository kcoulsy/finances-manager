"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";
import { createNoteAction } from "../actions/create-note.action";
import type { CreateNoteInput } from "../schemas/note.schema";

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNoteInput) => {
      const result = await createNoteAction(data);

      showToastFromAction(result as Parameters<typeof showToastFromAction>[0]);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.note;
      }

      throw new Error("Failed to create note");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: ["notes", { projectId: variables.projectId }],
        });
      }
    },
  });
}
