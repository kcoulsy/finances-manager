"use client";

import { useQuery } from "@tanstack/react-query";
import { getNoteFoldersAction } from "../actions/get-note-folders.action";
import type { GetNoteFoldersInput } from "../schemas/note-folder.schema";

export function useNoteFolders(input: GetNoteFoldersInput = {}) {
  return useQuery({
    queryKey: ["note-folders", input],
    queryFn: async () => {
      const result = await getNoteFoldersAction(input);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.folders;
      }

      throw new Error("Failed to fetch folders");
    },
  });
}

