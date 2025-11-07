"use client";

import {
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/features/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/components/ui/dialog";
import { Input } from "@/features/shared/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/features/shared/components/ui/popover";
import {
  Select,
  type SelectOption,
} from "@/features/shared/components/ui/select";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { useDebounce } from "@/features/shared/hooks/use-debounce";
import { useIsMobile } from "@/features/shared/hooks/use-mobile";
import { cn } from "@/features/shared/lib/utils";
import { useCreateNoteFolder } from "../hooks/use-create-note-folder";
import { useDeleteNote } from "../hooks/use-delete-note";
import { useNoteCategories } from "../hooks/use-note-categories";
import { useNoteFolders } from "../hooks/use-note-folders";
import { useNotes } from "../hooks/use-notes";
import { useRestoreNote } from "../hooks/use-restore-note";
import { useUpdateNote } from "../hooks/use-update-note";
import { useUpdateNoteFolder } from "../hooks/use-update-note-folder";
import { useNotesStore } from "../lib/notes-store";
import type { NoteLinkInput } from "../schemas/note.schema";
import { DeleteFolderModal } from "./delete-folder-modal";
import { NoteLinksDisplay } from "./note-links-display";
import { NoteLinksSelector } from "./note-links-selector";
import { NotesTreeView } from "./notes-tree-view";
import { QuickNoteModal } from "./quick-note-modal";
import { RenameFolderModal } from "./rename-folder-modal";

type NoteTab = "active" | "deleted";

type NoteWithRelations = {
  id: string;
  title: string | null;
  content: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
  categoryId: string | null;
  folderId: string | null;
  projectId: string | null;
  contactId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
  folder?: {
    id: string;
    name: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
  noteLinks?: Array<{
    id: string;
    linkType: "Contact" | "Project";
    linkId: string;
  }>;
};

const priorityOptions: SelectOption[] = [
  { value: "", label: "All Priorities" },
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "NORMAL", label: "Normal" },
  { value: "LOW", label: "Low" },
];

const categoryColorClassMap: Record<string, string> = {
  GRAY: "bg-gray-100 text-gray-800",
  RED: "bg-red-100 text-red-800",
  BLUE: "bg-blue-100 text-blue-800",
  TEAL: "bg-teal-100 text-teal-800",
  AMBER: "bg-amber-100 text-amber-800",
  GREEN: "bg-green-100 text-green-800",
  PURPLE: "bg-purple-100 text-purple-800",
  SLATE: "bg-slate-100 text-slate-800",
  ORANGE: "bg-orange-100 text-orange-800",
  CYAN: "bg-cyan-100 text-cyan-800",
  INDIGO: "bg-indigo-100 text-indigo-800",
  PINK: "bg-pink-100 text-pink-800",
};

const priorityBorderColorMap: Record<string, string> = {
  URGENT: "border-l-red-600",
  HIGH: "border-l-yellow-500",
  LOW: "border-l-gray-400",
  NORMAL: "border-l-blue-500",
};

export function NotesPageClient() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab] = useState<NoteTab>("active");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Tree view sorting and filtering
  const [treeSortBy, setTreeSortBy] = useState<
    "name" | "created_at" | "updated_at" | "priority"
  >("updated_at");
  const [treeSortDirection, setTreeSortDirection] = useState<"asc" | "desc">(
    "desc",
  );
  const [treePriorityFilter, setTreePriorityFilter] = useState<string>("");
  const [showFolders, setShowFolders] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState("");
  const [editingPriority, setEditingPriority] = useState<string>("NORMAL");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingLinks, setEditingLinks] = useState<NoteLinkInput[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [quickNoteModalOpen, setQuickNoteModalOpen] = useState(false);
  const [quickNoteFolderId, setQuickNoteFolderId] = useState<
    string | undefined
  >(undefined);
  const [createFolderParentId, setCreateFolderParentId] = useState<
    string | null
  >(null);
  const [renameFolderModalOpen, setRenameFolderModalOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [deleteFolderModalOpen, setDeleteFolderModalOpen] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const isMobile = useIsMobile();

  // Fetch all notes for tree view (no filters)
  const {
    data: allNotesData,
    isLoading: allNotesLoading,
    error: allNotesError,
  } = useNotes({
    status: "ACTIVE",
    sortBy: "updated_at",
    sortDirection: "desc",
    limit: 100, // Max allowed by schema
    offset: 0,
    includeDeleted: false,
  });

  // Debug logging
  console.log("allNotesData", allNotesData);
  console.log("allNotesData?.notes", allNotesData?.notes);
  console.log("allNotesLoading", allNotesLoading);
  console.log("allNotesError", allNotesError);

  // Fetch notes for deleted tab (if needed)
  const { data: notesData } = useNotes({
    status: activeTab === "deleted" ? "DELETED" : "ACTIVE",
    sortBy: "updated_at",
    sortDirection: "desc",
    limit: 100,
    offset: 0,
    includeDeleted: activeTab === "deleted",
  });

  const { data: folders = [] } = useNoteFolders({
    context: "global",
  });

  const { data: categories = [] } = useNoteCategories({});

  // Use Zustand store for folder expansion state
  const expandedFoldersArray = useNotesStore((state) => state.expandedFolders);
  const expandedFoldersSet = useMemo(
    () => new Set(expandedFoldersArray),
    [expandedFoldersArray],
  );
  const toggleFolderExpansion = useNotesStore((state) => state.toggleFolder);
  const expandFolder = useNotesStore((state) => state.expandFolder);

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const restoreNote = useRestoreNote();
  const createFolder = useCreateNoteFolder();
  const updateFolder = useUpdateNoteFolder();

  // Find selected note from all notes
  const allNotes = allNotesData?.notes || [];
  const deletedNotes = activeTab === "deleted" ? notesData?.notes || [] : [];
  const selectedNote =
    allNotes.find((n) => n.id === selectedNoteId) ||
    deletedNotes.find((n) => n.id === selectedNoteId);

  // Get recent notes (top 10 most recently updated)
  const recentNotes = useMemo(() => {
    return allNotes.slice(0, 10).map((note) => ({
      id: note.id,
      title: note.title || null,
      content: note.content,
      folderId: note.folderId ?? null,
      noteLinks: (note as NoteWithRelations).noteLinks || [],
    }));
  }, [allNotes]);

  // Get recently deleted notes (top 10 most recently deleted)
  const recentlyDeletedNotes = useMemo(() => {
    return deletedNotes.slice(0, 10).map((note) => ({
      id: note.id,
      title: note.title || null,
      content: note.content,
      folderId: note.folderId ?? null,
      noteLinks: (note as NoteWithRelations).noteLinks || [],
    }));
  }, [deletedNotes]);

  const handleSelectNote = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
    setIsEditing(false);
    // On mobile, selecting a note automatically shows the note view
    // (sidebar will be hidden via conditional rendering)
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedNoteId(null);
    setIsEditing(false);
  }, []);

  const handleStartEditing = useCallback(() => {
    if (selectedNote) {
      setEditingContent(selectedNote.content);
      setEditingPriority(selectedNote.priority);
      setEditingCategoryId(selectedNote.categoryId || null);
      // Initialize links from the note's noteLinks
      const noteLinks = (selectedNote as NoteWithRelations).noteLinks || [];
      setEditingLinks(
        noteLinks.map((link) => ({
          linkType: link.linkType as "Contact" | "Project",
          linkId: link.linkId,
        })),
      );
      setIsEditing(true);
    }
  }, [selectedNote]);

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditingContent("");
    setEditingPriority("NORMAL");
    setEditingCategoryId(null);
    setEditingLinks([]);
  }, []);

  const handleSaveNote = useCallback(async () => {
    if (!selectedNoteId || !editingContent.trim()) return;

    try {
      await updateNote.mutateAsync({
        noteId: selectedNoteId,
        content: editingContent,
        priority: editingPriority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
        categoryId: editingCategoryId,
        links: editingLinks,
      });
      setIsEditing(false);
    } catch {
      // Error handled by toast
    }
  }, [
    selectedNoteId,
    editingContent,
    editingPriority,
    editingCategoryId,
    editingLinks,
    updateNote,
  ]);

  const handleDeleteNote = useCallback(async () => {
    if (!selectedNoteId) return;

    try {
      await deleteNote.mutateAsync({ noteId: selectedNoteId });
      setSelectedNoteId(null);
    } catch {
      // Error handled by toast
    }
  }, [selectedNoteId, deleteNote]);

  const handleRestoreNote = useCallback(async () => {
    if (!selectedNoteId) return;

    try {
      await restoreNote.mutateAsync({ noteId: selectedNoteId });
      setSelectedNoteId(null);
    } catch {
      // Error handled by toast
    }
  }, [selectedNoteId, restoreNote]);

  const calculateFolderDepth = useCallback(
    (folderId: string, allFolders: typeof folders): number => {
      const folder = allFolders.find((f) => f.id === folderId);
      if (!folder || !folder.parentId) return 0;
      return 1 + calculateFolderDepth(folder.parentId, allFolders);
    },
    [],
  );

  const availableParentFolders = useMemo(() => {
    return folders.filter((folder) => {
      const depth = calculateFolderDepth(folder.id, folders);
      return depth < 2; // Max 3 levels (0, 1, 2), so parent can be at most level 1
    });
  }, [folders, calculateFolderDepth]);

  const handleCreateFolderSubmit = useCallback(async () => {
    if (!newFolderName.trim()) return;

    // Validate depth
    if (createFolderParentId) {
      const parentDepth = calculateFolderDepth(createFolderParentId, folders);
      if (parentDepth >= 2) {
        // This shouldn't happen due to filtering, but double-check
        return;
      }
    }

    try {
      await createFolder.mutateAsync({
        name: newFolderName,
        description: newFolderDescription || undefined,
        parentId: createFolderParentId || undefined,
        context: "global",
      });
      setShowFolderModal(false);
      setNewFolderName("");
      setNewFolderDescription("");
      setCreateFolderParentId(null);
      // Expand the parent folder if it exists
      if (createFolderParentId) {
        expandFolder(createFolderParentId);
      }
    } catch {
      // Error handled by toast
    }
  }, [
    newFolderName,
    newFolderDescription,
    createFolderParentId,
    createFolder,
    calculateFolderDepth,
    folders,
    expandFolder,
  ]);

  const handleCreateNote = useCallback((folderId?: string) => {
    setSelectedFolderId(folderId || null);
    setQuickNoteFolderId(folderId);
    setQuickNoteModalOpen(true);
  }, []);

  const handleCreateFolder = useCallback((parentId?: string | null) => {
    setCreateFolderParentId(parentId || null);
    setShowFolderModal(true);
  }, []);

  const handleMoveNote = useCallback(
    async (noteId: string, folderId: string | null) => {
      try {
        // Find the note to get its current content
        const note = allNotes.find((n) => n.id === noteId);
        if (!note) return;

        await updateNote.mutateAsync({
          noteId,
          content: note.content,
          folderId: folderId || undefined,
        });

        // Expand the target folder if it exists
        if (folderId) {
          expandFolder(folderId);
          // Also expand all parent folders
          let currentFolderId: string | null = folderId;
          while (currentFolderId) {
            const folder = folders.find((f) => f.id === currentFolderId);
            if (folder?.parentId) {
              expandFolder(folder.parentId);
              currentFolderId = folder.parentId;
            } else {
              currentFolderId = null;
            }
          }
        }
      } catch {
        // Error handled by toast
      }
    },
    [allNotes, updateNote, expandFolder, folders],
  );

  const handleMoveFolder = useCallback(
    async (folderId: string, parentId: string | null) => {
      try {
        // Find the folder to get its current name
        const folder = folders.find((f) => f.id === folderId);
        if (!folder) return;

        await updateFolder.mutateAsync({
          folderId,
          parentId: parentId || null,
        });

        // Expand the target folder if it exists
        if (parentId) {
          expandFolder(parentId);
          // Also expand all parent folders
          let currentFolderId: string | null = parentId;
          while (currentFolderId) {
            const parentFolder = folders.find((f) => f.id === currentFolderId);
            if (parentFolder?.parentId) {
              expandFolder(parentFolder.parentId);
              currentFolderId = parentFolder.parentId;
            } else {
              currentFolderId = null;
            }
          }
        }
      } catch {
        // Error handled by toast
      }
    },
    [folders, updateFolder, expandFolder],
  );

  // On mobile: show sidebar if no note selected, show note if note selected
  // On desktop: show both side by side
  const showSidebarOnMobile = isMobile && !selectedNoteId;
  const showNoteOnMobile = isMobile && selectedNoteId;
  const showSidebarOnDesktop = !isMobile && !sidebarCollapsed;

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background">
      {/* Left Sidebar */}
      {(showSidebarOnMobile || showSidebarOnDesktop) && (
        <div
          className={`${
            isMobile ? "w-full" : sidebarCollapsed ? "w-0" : "w-72"
          } border-r border-border bg-card flex flex-col h-full transition-all duration-300 overflow-hidden`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Notes</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  All your notes
                </p>
              </div>
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(true)}
                  className="h-8"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearch("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 gap-2",
                      treePriorityFilter && "bg-primary/10 border-primary",
                    )}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filter
                    {treePriorityFilter && (
                      <span className="ml-1 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="start">
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="tree-priority-filter"
                        className="text-sm font-medium mb-2 block"
                      >
                        Priority
                      </label>
                      <Select
                        value={treePriorityFilter}
                        onValueChange={setTreePriorityFilter}
                        options={priorityOptions}
                        placeholder="All Priorities"
                      />
                    </div>
                    <div className="flex justify-end">
                      {treePriorityFilter && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTreePriorityFilter("")}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="start">
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="tree-sort-by"
                        className="text-sm font-medium mb-2 block"
                      >
                        Sort By
                      </label>
                      <Select
                        value={treeSortBy}
                        onValueChange={(value) =>
                          setTreeSortBy(
                            value as
                              | "name"
                              | "created_at"
                              | "updated_at"
                              | "priority",
                          )
                        }
                        options={[
                          { value: "name", label: "Name" },
                          { value: "created_at", label: "Date Created" },
                          { value: "updated_at", label: "Date Edited" },
                          { value: "priority", label: "Priority" },
                        ]}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tree-sort-direction"
                        className="text-sm font-medium mb-2 block"
                      >
                        Direction
                      </label>
                      <Select
                        value={treeSortDirection}
                        onValueChange={(value) =>
                          setTreeSortDirection(value as "asc" | "desc")
                        }
                        options={[
                          { value: "asc", label: "Ascending" },
                          { value: "desc", label: "Descending" },
                        ]}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2"
                onClick={() => setShowFolders(!showFolders)}
                title={showFolders ? "Hide folders" : "Show folders"}
              >
                {showFolders ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                Folders
              </Button>
            </div>
          </div>

          {/* Navigation Tree */}
          <div className="flex-1 overflow-hidden">
            {allNotesLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">
                  Loading notes...
                </p>
              </div>
            ) : (
              <NotesTreeView
                folders={folders}
                notes={
                  allNotesData?.notes
                    ? allNotesData.notes.map((note) => ({
                        id: note.id,
                        title: note.title || null,
                        content: note.content,
                        folderId: note.folderId ?? null, // Use nullish coalescing to preserve null
                        noteLinks: (note as NoteWithRelations).noteLinks || [],
                        createdAt: note.createdAt,
                        updatedAt: note.updatedAt,
                        priority: note.priority,
                      }))
                    : []
                }
                recentNotes={recentNotes}
                recentlyDeletedNotes={recentlyDeletedNotes}
                selectedNoteId={selectedNoteId}
                selectedFolderId={selectedFolderId}
                onSelectNote={handleSelectNote}
                onSelectFolder={(folderId) => {
                  setSelectedFolderId(folderId);
                  setSelectedCategoryId(null);
                }}
                onCreateNote={handleCreateNote}
                onCreateFolder={handleCreateFolder}
                expandedFolders={expandedFoldersSet}
                onToggleFolder={toggleFolderExpansion}
                onMoveNote={handleMoveNote}
                onMoveFolder={handleMoveFolder}
                search={debouncedSearch}
                sortBy={treeSortBy}
                sortDirection={treeSortDirection}
                priorityFilter={treePriorityFilter}
                onRenameFolder={(folderId) => {
                  setRenameFolderId(folderId);
                  setRenameFolderModalOpen(true);
                }}
                onDeleteFolder={(folderId) => {
                  setDeleteFolderId(folderId);
                  setDeleteFolderModalOpen(true);
                }}
                showFolders={showFolders}
              />
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {(showNoteOnMobile || !isMobile) && (
        <div className="flex-1 flex flex-col h-full min-w-0">
          {/* Content Header - Only show on desktop or when note is selected on mobile */}
          {(!isMobile || selectedNoteId) && (
            <div className="bg-card border-b border-border p-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {isMobile && selectedNoteId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBackToList}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                  )}
                  {!isMobile && sidebarCollapsed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSidebarCollapsed(false)}
                    >
                      <PanelLeftOpen className="w-4 h-4 mr-2" />
                      Show Sidebar
                    </Button>
                  )}
                  {!isMobile && (
                    <div>
                      <h1 className="text-xl font-semibold">
                        {selectedFolderId
                          ? folders.find((f) => f.id === selectedFolderId)
                              ?.name || "Folder"
                          : selectedCategoryId
                            ? categories.find(
                                (c) => c.id === selectedCategoryId,
                              )?.name || "Category"
                            : "All Notes"}
                      </h1>
                      <p className="text-sm text-muted-foreground mt-1">
                        {search
                          ? `Search results for "${search}"`
                          : "Browse and manage your notes"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isMobile && (
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Note
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56">
                        <div className="space-y-1">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              setQuickNoteModalOpen(true);
                            }}
                          >
                            <StickyNote className="w-4 h-4 mr-3 text-purple-600" />
                            <div className="flex flex-col">
                              <span className="font-medium">Quick Note</span>
                              <span className="text-xs text-muted-foreground">
                                Fast note creation
                              </span>
                            </div>
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "active" && (
            <>
              {/* Note Content */}
              <div
                className={cn(
                  "flex-1 bg-card flex flex-col h-full min-w-0",
                  isMobile && !selectedNoteId && "hidden",
                )}
              >
                {selectedNote ? (
                  <>
                    {/* Note Header */}
                    <div
                      className={`border-b border-border p-4 shrink-0 border-l-4 ${
                        priorityBorderColorMap[selectedNote.priority] ||
                        "border-l-blue-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">
                            {selectedNote.priority} Priority
                          </span>
                          {(selectedNote as NoteWithRelations).category && (
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                categoryColorClassMap[
                                  (selectedNote as NoteWithRelations).category
                                    ?.color || "GRAY"
                                ] || "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {
                                (selectedNote as NoteWithRelations).category
                                  ?.name
                              }
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleStartEditing}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDeleteNote}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Note Links */}
                      {(selectedNote as NoteWithRelations).noteLinks &&
                        ((selectedNote as NoteWithRelations).noteLinks
                          ?.length ?? 0) > 0 && (
                          <div className="mt-3">
                            <NoteLinksDisplay
                              noteLinks={
                                (selectedNote as NoteWithRelations).noteLinks ||
                                []
                              }
                            />
                          </div>
                        )}
                    </div>

                    {/* Note Content */}
                    <div className="flex-1 p-6 overflow-y-auto min-h-0">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label
                              htmlFor="editing-content"
                              className="block text-sm font-medium mb-2"
                            >
                              Note Content
                            </label>
                            <Textarea
                              id="editing-content"
                              value={editingContent}
                              onChange={(e) =>
                                setEditingContent(e.target.value)
                              }
                              rows={12}
                              className="w-full"
                            />
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs text-muted-foreground">
                                Markdown supported
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {editingContent.length} / 4000
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <label
                                htmlFor="editing-priority"
                                className="block text-sm font-medium mb-2"
                              >
                                Priority
                              </label>
                              <Select
                                value={editingPriority}
                                onValueChange={setEditingPriority}
                                options={[
                                  { value: "NORMAL", label: "Normal" },
                                  { value: "LOW", label: "Low" },
                                  { value: "HIGH", label: "High" },
                                  { value: "URGENT", label: "Urgent" },
                                ]}
                              />
                            </div>
                            <div className="flex-1">
                              <label
                                htmlFor="editing-category"
                                className="block text-sm font-medium mb-2"
                              >
                                Category
                              </label>
                              <Select
                                value={editingCategoryId || ""}
                                onValueChange={(value) =>
                                  setEditingCategoryId(value || null)
                                }
                                options={[
                                  { value: "", label: "No Category" },
                                  ...categories.map((c) => ({
                                    value: c.id,
                                    label: c.name,
                                  })),
                                ]}
                              />
                            </div>
                          </div>

                          {/* Note Links */}
                          <div>
                            <NoteLinksSelector
                              value={editingLinks}
                              onChange={setEditingLinks}
                            />
                          </div>

                          <div className="flex justify-end gap-3">
                            <Button
                              variant="outline"
                              onClick={handleCancelEditing}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSaveNote}
                              disabled={
                                updateNote.isPending || !editingContent.trim()
                              }
                            >
                              {updateNote.isPending
                                ? "Saving..."
                                : "Save Changes"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="prose max-w-none">
                          <div className="whitespace-pre-wrap text-foreground">
                            {selectedNote.content}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <StickyNote className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No note selected
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Select a note from the list to view its content.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "deleted" && (
            <div
              className={cn(
                "flex-1 bg-card flex flex-col h-full min-w-0",
                isMobile && !selectedNoteId && "hidden",
              )}
            >
              {selectedNote ? (
                <>
                  {/* Note Header */}
                  <div className="border-b border-l-4 border-border border-l-destructive p-4 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-destructive rounded-full" />
                        <span className="text-sm font-medium">
                          Deleted Note
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRestoreNote}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore Note
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Note Content */}
                  <div className="flex-1 p-6 overflow-y-auto min-h-0">
                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap text-foreground">
                        {selectedNote.content}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Trash2 className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Recently Deleted Notes
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select a deleted note from the tree view to preview its
                    content before restoring or permanently deleting it.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rename Folder Modal */}
      <RenameFolderModal
        open={renameFolderModalOpen}
        onOpenChange={setRenameFolderModalOpen}
        folderId={renameFolderId}
        folderName={folders.find((f) => f.id === renameFolderId)?.name || ""}
      />

      {/* Delete Folder Modal */}
      <DeleteFolderModal
        open={deleteFolderModalOpen}
        onOpenChange={setDeleteFolderModalOpen}
        folderId={deleteFolderId}
        folderName={folders.find((f) => f.id === deleteFolderId)?.name || ""}
        noteCount={
          allNotes.filter((note) => note.folderId === deleteFolderId).length
        }
      />

      {/* Folder Creation Modal */}
      <Dialog open={showFolderModal} onOpenChange={setShowFolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="folder-name"
                className="block text-sm font-medium mb-1"
              >
                Folder Name
              </label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
            <div>
              <label
                htmlFor="folder-description"
                className="block text-sm font-medium mb-1"
              >
                Description (Optional)
              </label>
              <Textarea
                id="folder-description"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="Enter folder description"
                rows={3}
              />
            </div>
            <div>
              <label
                htmlFor="folder-parent"
                className="block text-sm font-medium mb-1"
              >
                Parent Folder (Optional)
              </label>
              <Select
                value={createFolderParentId || ""}
                onValueChange={(value) =>
                  setCreateFolderParentId(value || null)
                }
                options={[
                  { value: "", label: "No parent (root folder)" },
                  ...availableParentFolders.map((f) => ({
                    value: f.id,
                    label: f.name,
                  })),
                ]}
              />
              {createFolderParentId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selected:{" "}
                  {folders.find((f) => f.id === createFolderParentId)?.name}
                </p>
              )}
              {availableParentFolders.length === 0 && folders.length > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  All existing folders are at maximum depth (3 levels). Create a
                  root folder instead.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFolderModal(false);
                setNewFolderName("");
                setNewFolderDescription("");
                setCreateFolderParentId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolderSubmit}
              disabled={createFolder.isPending || !newFolderName.trim()}
            >
              {createFolder.isPending ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Note Modal */}
      <QuickNoteModal
        open={quickNoteModalOpen}
        onOpenChange={(open) => {
          setQuickNoteModalOpen(open);
          if (!open) {
            setQuickNoteFolderId(undefined);
          }
        }}
        folderId={quickNoteFolderId}
        categoryId={selectedCategoryId || undefined}
        onNoteCreated={(noteId, noteFolderId) => {
          // Select the newly created note
          handleSelectNote(noteId);

          // Expand all parent folders
          if (noteFolderId) {
            let currentFolderId: string | null = noteFolderId;
            while (currentFolderId) {
              expandFolder(currentFolderId);
              const folder = folders.find((f) => f.id === currentFolderId);
              currentFolderId = folder?.parentId || null;
            }
          }
        }}
      />
    </div>
  );
}
