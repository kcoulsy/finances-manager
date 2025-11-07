"use client";

import { useQuery } from "@tanstack/react-query";
import { getNoteAction } from "../actions/get-note.action";
import type { GetNoteInput } from "../schemas/note.schema";

export function useNote(input: GetNoteInput) {
  return useQuery({
    queryKey: ["note", input.noteId],
    queryFn: async () => {
      const result = await getNoteAction(input);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.note;
      }

      throw new Error("Failed to fetch note");
    },
    enabled: !!input.noteId,
  });
}

