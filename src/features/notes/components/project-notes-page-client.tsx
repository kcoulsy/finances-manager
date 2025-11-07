"use client";

import {
  ArrowLeft,
  ChevronDown,
  Folder,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { Card } from "@/features/shared/components/ui/card";
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
import { useCreateNoteFolder } from "../hooks/use-create-note-folder";
import { useDeleteNote } from "../hooks/use-delete-note";
import { useNoteCategories } from "../hooks/use-note-categories";
import { useNoteFolders } from "../hooks/use-note-folders";
import { useNotes } from "../hooks/use-notes";
import { useRestoreNote } from "../hooks/use-restore-note";
import { useUpdateNote } from "../hooks/use-update-note";
import { NoteLinksDisplay } from "./note-links-display";
import { QuickNoteModal } from "./quick-note-modal";

interface ProjectNotesPageClientProps {
  projectId: string;
  projectName: string;
}

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

const sortByOptions: SelectOption[] = [
  { value: "updated_at", label: "Date Modified" },
  { value: "created_at", label: "Date Created" },
  { value: "priority", label: "Priority" },
];

const sortDirectionOptions: SelectOption[] = [
  { value: "desc", label: "Newest First" },
  { value: "asc", label: "Oldest First" },
];

const categoryColorMap: Record<string, string> = {
  GRAY: "#6b7280",
  RED: "#ef4444",
  BLUE: "#3b82f6",
  TEAL: "#14b8a6",
  AMBER: "#f59e0b",
  GREEN: "#10b981",
  PURPLE: "#8b5cf6",
  SLATE: "#64748b",
  ORANGE: "#f97316",
  CYAN: "#06b6d4",
  INDIGO: "#6366f1",
  PINK: "#ec4899",
};

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

export function ProjectNotesPageClient({
  projectId,
  projectName,
}: ProjectNotesPageClientProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<NoteTab>("active");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("updated_at");
  const [sortDirection, setSortDirection] = useState<string>("desc");
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState("");
  const [editingPriority, setEditingPriority] = useState<string>("NORMAL");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(
    null,
  );
  const [expandedFolders, setExpandedFolders] = useState<number[]>([]);
  const [quickNoteModalOpen, setQuickNoteModalOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const { data: notesData, isLoading: notesLoading } = useNotes({
    projectId,
    folderId: selectedFolderId || undefined,
    categoryId: selectedCategoryId || undefined,
    search: debouncedSearch || undefined,
    priority: (priorityFilter || undefined) as
      | "LOW"
      | "NORMAL"
      | "HIGH"
      | "URGENT"
      | undefined,
    status: activeTab === "deleted" ? "DELETED" : "ACTIVE",
    sortBy: sortBy as "created_at" | "updated_at" | "priority",
    sortDirection: sortDirection as "asc" | "desc",
    limit: 50,
    offset: 0,
    includeDeleted: activeTab === "deleted",
  });

  const { data: folders = [] } = useNoteFolders({
    projectId,
    context: "project",
  });

  const { data: categories = [] } = useNoteCategories({});

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const restoreNote = useRestoreNote();
  const createFolder = useCreateNoteFolder();

  const notes = notesData?.notes || [];
  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  const handleSelectNote = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
    setIsEditing(false);
  }, []);

  const handleStartEditing = useCallback(() => {
    if (selectedNote) {
      setEditingContent(selectedNote.content);
      setEditingPriority(selectedNote.priority);
      setEditingCategoryId(selectedNote.categoryId || null);
      setIsEditing(true);
    }
  }, [selectedNote]);

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditingContent("");
    setEditingPriority("NORMAL");
    setEditingCategoryId(null);
  }, []);

  const handleSaveNote = useCallback(async () => {
    if (!selectedNoteId || !editingContent.trim()) return;

    try {
      await updateNote.mutateAsync({
        noteId: selectedNoteId,
        content: editingContent,
        priority: editingPriority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
        categoryId: editingCategoryId,
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

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;

    try {
      await createFolder.mutateAsync({
        name: newFolderName,
        description: newFolderDescription || undefined,
        parentId: newFolderParentId || undefined,
        projectId,
        context: "project",
      });
      setShowFolderModal(false);
      setNewFolderName("");
      setNewFolderDescription("");
      setNewFolderParentId(null);
    } catch {
      // Error handled by toast
    }
  }, [
    newFolderName,
    newFolderDescription,
    newFolderParentId,
    projectId,
    createFolder,
  ]);

  const toggleFolderExpansion = useCallback((folderId: number | string) => {
    const id = typeof folderId === "string" ? parseInt(folderId, 10) : folderId;
    setExpandedFolders((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }, []);

  const groupedNotes = useMemo(() => {
    const groups: Record<string, typeof notes> = {};
    notes.forEach((note) => {
      const date = new Date(note.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let groupKey: string;
      if (diffDays <= 7) {
        groupKey = "Previous 7 Days";
      } else if (diffDays <= 30) {
        groupKey = "This Month";
      } else {
        groupKey = date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(note);
    });

    return groups;
  }, [notes]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setPriorityFilter("");
    setSortBy("updated_at");
    setSortDirection("desc");
    setSelectedCategoryId(null);
    setSelectedFolderId(null);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      !!search ||
      !!priorityFilter ||
      sortBy !== "updated_at" ||
      sortDirection !== "desc" ||
      selectedCategoryId !== null ||
      selectedFolderId !== null
    );
  }, [
    search,
    priorityFilter,
    sortBy,
    sortDirection,
    selectedCategoryId,
    selectedFolderId,
  ]);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background">
      {/* Left Sidebar */}
      <div
        className={`${
          sidebarCollapsed ? "w-0" : "w-72"
        } border-r border-border bg-card flex flex-col h-full transition-all duration-300 overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="mb-3">
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md px-2 py-1 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Project Notes</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {projectName}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(true)}
              className="h-8"
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-border">
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
        </div>

        {/* Navigation Tree */}
        <div className="flex-1 overflow-y-auto">
          {/* All Project Notes */}
          <div className="p-2">
            <Button
              variant={
                selectedCategoryId === null && selectedFolderId === null
                  ? "secondary"
                  : "ghost"
              }
              className="w-full justify-start"
              onClick={() => {
                setSelectedCategoryId(null);
                setSelectedFolderId(null);
              }}
            >
              <StickyNote className="w-4 h-4 mr-2" />
              <span className="font-medium">All Project Notes</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {notesData?.total || 0}
              </span>
            </Button>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="px-2 py-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Categories
              </h3>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={
                    selectedCategoryId === category.id ? "secondary" : "ghost"
                  }
                  className="w-full justify-start mb-1"
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setSelectedFolderId(null);
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{
                      backgroundColor:
                        categoryColorMap[category.color] || "#6b7280",
                    }}
                  />
                  <span className="truncate text-sm flex-1 text-left">
                    {category.name}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {category._count?.notes || 0}
                  </span>
                </Button>
              ))}
            </div>
          )}

          {/* Folders */}
          <div className="px-2 py-1">
            <div className="flex items-center justify-between gap-3 p-1.5">
              <Button
                variant="ghost"
                className="flex-1 justify-between"
                onClick={() => toggleFolderExpansion(0)}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Folders
                  </h3>
                  {folders.length > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {folders.reduce(
                        (acc, f) => acc + (f._count?.notes || 0),
                        0,
                      )}{" "}
                      items
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-3 h-3 text-muted-foreground transition-transform ${
                    expandedFolders.includes(0) ? "rotate-180" : ""
                  }`}
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFolderModal(true)}
                className="h-8 w-8 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {expandedFolders.includes(0) && (
              <div className="mt-2">
                {folders.filter((f) => !f.parentId).length > 0 ? (
                  folders
                    .filter((f) => !f.parentId)
                    .map((folder) => (
                      <Button
                        key={folder.id}
                        variant={
                          selectedFolderId === folder.id ? "secondary" : "ghost"
                        }
                        className="w-full justify-start mb-1"
                        onClick={() => {
                          setSelectedFolderId(folder.id);
                          setSelectedCategoryId(null);
                        }}
                      >
                        <Folder className="w-4 h-4 mr-2" />
                        <span className="truncate text-sm flex-1 text-left">
                          {folder.name}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          {folder._count?.notes || 0}
                        </span>
                      </Button>
                    ))
                ) : (
                  <div className="text-xs text-muted-foreground italic px-2">
                    No folders yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Content Header */}
        <div className="bg-card border-b border-border p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {sidebarCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(false)}
                >
                  <PanelLeftOpen className="w-4 h-4 mr-2" />
                  Show Sidebar
                </Button>
              )}
              <div>
                <h1 className="text-xl font-semibold">
                  {selectedFolderId
                    ? folders.find((f) => f.id === selectedFolderId)?.name ||
                      "Folder"
                    : selectedCategoryId
                      ? categories.find((c) => c.id === selectedCategoryId)
                          ?.name || "Category"
                      : `${projectName} Notes`}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {search
                    ? `Search results for "${search}"`
                    : "Browse and manage project notes"}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
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
          </div>

          {/* Tabs */}
          <div className="mt-4 border-b border-border">
            <div className="flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab("active")}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "active"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                }`}
              >
                <span className="flex items-center">
                  <StickyNote className="w-4 h-4 mr-2" />
                  Active Notes
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("deleted")}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "deleted"
                    ? "border-destructive text-destructive"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                }`}
              >
                <span className="flex items-center">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Recently Deleted
                </span>
              </button>
            </div>
          </div>
        </div>

        {activeTab === "active" && (
          <>
            {/* Filters Bar */}
            <div className="bg-card border-b border-border p-2 flex-shrink-0">
              <div className="flex flex-wrap gap-2">
                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                  options={priorityOptions}
                  placeholder="All Priorities"
                  className="w-[140px]"
                />
                <Select
                  value={sortBy}
                  onValueChange={setSortBy}
                  options={sortByOptions}
                  className="w-[140px]"
                />
                <Select
                  value={sortDirection}
                  onValueChange={setSortDirection}
                  options={sortDirectionOptions}
                  className="w-[140px]"
                />
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Notes List and Content */}
            <div className="flex-1 flex min-h-0">
              {/* Notes List */}
              <div className="w-80 border-r border-border bg-card flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-3 min-h-0">
                  {notesLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading notes...
                    </div>
                  ) : notes.length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(groupedNotes).map(
                        ([month, monthNotes]) => (
                          <div key={month} className="mb-2">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              {month}
                            </h3>
                            <div className="space-y-1">
                              {monthNotes.map((note) => (
                                <Card
                                  key={note.id}
                                  className={`p-2 cursor-pointer transition-colors border-l-4 ${
                                    selectedNoteId === note.id
                                      ? "bg-primary/10 border-primary"
                                      : "hover:bg-accent"
                                  } ${priorityBorderColorMap[note.priority] || "border-l-blue-500"}`}
                                  onClick={() => handleSelectNote(note.id)}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-medium truncate">
                                        {note.title ||
                                          note.content.substring(0, 60)}
                                      </h4>
                                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                                        {(note as NoteWithRelations)
                                          .category && (
                                          <span
                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                              categoryColorClassMap[
                                                (note as NoteWithRelations)
                                                  .category?.color || "GRAY"
                                              ] || "bg-gray-100 text-gray-800"
                                            }`}
                                          >
                                            {
                                              (note as NoteWithRelations)
                                                .category?.name
                                            }
                                          </span>
                                        )}
                                        {(note as NoteWithRelations).folder && (
                                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                                            <Folder className="w-3 h-3" />
                                            {(
                                              note as NoteWithRelations
                                            ).folder?.name.substring(0, 12)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectNote(note.id);
                                          handleStartEditing();
                                        }}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <StickyNote className="w-16 h-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        No notes found
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {search
                          ? "No notes match your search criteria."
                          : 'Click "Create Note" above to get started.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Note Content */}
              <div className="flex-1 bg-card flex flex-col h-full min-w-0">
                {selectedNote ? (
                  <>
                    {/* Note Header */}
                    <div
                      className={`border-b border-border p-4 flex-shrink-0 border-l-4 ${
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
            </div>
          </>
        )}

        {activeTab === "deleted" && (
          <div className="flex-1 flex min-h-0">
            <div className="w-96 border-r border-border bg-card flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-3 min-h-0">
                {notes.length > 0 ? (
                  <div className="space-y-2">
                    {notes.map((note) => (
                      <Card
                        key={note.id}
                        className={`p-3 cursor-pointer transition-colors ${
                          selectedNoteId === note.id
                            ? "border-destructive bg-destructive/10"
                            : "hover:bg-accent"
                        }`}
                        onClick={() => handleSelectNote(note.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">
                              {note.title || note.content.substring(0, 60)}
                            </h4>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-muted-foreground">
                                Deleted{" "}
                                {note.deletedAt
                                  ? new Date(
                                      note.deletedAt,
                                    ).toLocaleDateString()
                                  : ""}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreNote();
                              }}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trash2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No deleted notes
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Deleted project notes will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Deleted Note Preview */}
            <div className="flex-1 bg-card flex flex-col h-full">
              {selectedNote ? (
                <>
                  <div className="border-b border-border p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-destructive rounded-full" />
                        <span className="text-sm font-medium">
                          Deleted Note Preview
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
                  <div className="flex-1 p-6 overflow-y-auto min-h-0">
                    <Card className="mb-4">
                      <div className="prose prose-lg max-w-none">
                        <div className="whitespace-pre-wrap text-foreground text-base leading-relaxed">
                          {selectedNote.content}
                        </div>
                      </div>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Trash2 className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Recently Deleted Project Notes
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click a deleted note to preview its content before restoring
                    or permanently deleting it.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
                value={newFolderParentId || ""}
                onValueChange={(value) => setNewFolderParentId(value || null)}
                options={[
                  { value: "", label: "No parent (root folder)" },
                  ...folders.map((f) => ({
                    value: f.id,
                    label: f.name,
                  })),
                ]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFolderModal(false);
                setNewFolderName("");
                setNewFolderDescription("");
                setNewFolderParentId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
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
        onOpenChange={setQuickNoteModalOpen}
        projectId={projectId}
        folderId={selectedFolderId || undefined}
        categoryId={selectedCategoryId || undefined}
      />
    </div>
  );
}
