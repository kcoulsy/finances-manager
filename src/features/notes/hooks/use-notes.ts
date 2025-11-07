"use client";

import { useQuery } from "@tanstack/react-query";
import { getNotesAction } from "../actions/get-notes.action";
import type { GetNotesInput } from "../schemas/note.schema";

export function useNotes(input: GetNotesInput) {
  return useQuery({
    queryKey: ["notes", input],
    queryFn: async () => {
      const result = await getNotesAction(input);

      console.log("useNotes result", result);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data;
      }

      console.error("useNotes: Failed to fetch notes", result);
      throw new Error("Failed to fetch notes");
    },
  });
}
