"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface NotesStoreState {
  expandedFolders: string[];
}

interface NotesStore extends NotesStoreState {
  toggleFolder: (folderId: string) => void;
  expandFolder: (folderId: string) => void;
  collapseFolder: (folderId: string) => void;
  setExpandedFolders: (folders: Set<string>) => void;
  getExpandedFoldersSet: () => Set<string>;
}

export const useNotesStore = create<NotesStore>()(
  persist(
    (set, get) => ({
      expandedFolders: [],
      toggleFolder: (folderId: string) =>
        set((state) => {
          const currentSet = new Set(state.expandedFolders);
          if (currentSet.has(folderId)) {
            currentSet.delete(folderId);
          } else {
            currentSet.add(folderId);
          }
          return { expandedFolders: Array.from(currentSet) };
        }),
      expandFolder: (folderId: string) =>
        set((state) => {
          const currentSet = new Set(state.expandedFolders);
          currentSet.add(folderId);
          return { expandedFolders: Array.from(currentSet) };
        }),
      collapseFolder: (folderId: string) =>
        set((state) => {
          const currentSet = new Set(state.expandedFolders);
          currentSet.delete(folderId);
          return { expandedFolders: Array.from(currentSet) };
        }),
      setExpandedFolders: (folders: Set<string>) =>
        set({ expandedFolders: Array.from(folders) }),
      getExpandedFoldersSet: () => new Set(get().expandedFolders),
    }),
    {
      name: "notes-folder-expansion",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
