"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  Folder,
  FolderPlus,
  MoreVertical,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getContactAction } from "@/features/contacts/actions/get-contact.action";
import { useContacts } from "@/features/contacts/hooks/use-contacts";
import { getProjectAction } from "@/features/projects/actions/get-project.action";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { Button } from "@/features/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/features/shared/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/features/shared/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/features/shared/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/features/shared/components/ui/tooltip";
import { cn } from "@/features/shared/lib/utils/index";

type FolderWithChildren = {
  id: string;
  name: string;
  parentId: string | null;
  _count?: {
    notes: number;
    children: number;
  };
  children?: FolderWithChildren[];
  notes?: NoteItem[];
};

type NoteItem = {
  id: string;
  title: string | null;
  content: string;
  folderId: string | null;
  noteLinks?: Array<{
    id: string;
    linkType: "Contact" | "Project";
    linkId: string;
  }>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
};

interface NotesTreeViewProps {
  folders: FolderWithChildren[];
  notes: NoteItem[];
  recentNotes?: NoteItem[];
  recentlyDeletedNotes?: NoteItem[];
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  onSelectNote: (noteId: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onCreateNote: (folderId?: string) => void;
  onCreateFolder: (parentId?: string | null) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  onMoveNote?: (noteId: string, folderId: string | null) => void;
  onMoveFolder?: (folderId: string, parentId: string | null) => void;
  search?: string;
  sortBy?: "name" | "created_at" | "updated_at" | "priority";
  sortDirection?: "asc" | "desc";
  priorityFilter?: string;
  onRenameFolder?: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  showFolders?: boolean;
}

function calculateFolderDepth(
  folder: FolderWithChildren,
  allFolders: FolderWithChildren[],
  depth = 0,
): number {
  if (!folder.parentId || depth >= 3) return depth;
  const parent = allFolders.find((f) => f.id === folder.parentId);
  if (!parent) return depth;
  return calculateFolderDepth(parent, allFolders, depth + 1);
}

function getInitials(name: string, maxLength = 2): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return "";
  if (words.length === 1) {
    return name.substring(0, maxLength).toUpperCase();
  }
  // Take first letter of first word and first letter of last word
  const firstWord = words[0];
  const lastWord = words[words.length - 1];
  if (!firstWord || !lastWord) return "";
  const firstChar = firstWord[0];
  const lastChar = lastWord[0];
  if (!firstChar || !lastChar) return "";
  return (firstChar + lastChar).toUpperCase();
}

function buildTree(
  folders: FolderWithChildren[],
  notes: NoteItem[],
  sortBy: "name" | "created_at" | "updated_at" | "priority" = "updated_at",
  sortDirection: "asc" | "desc" = "desc",
): FolderWithChildren[] {
  const folderMap = new Map<string, FolderWithChildren>();
  const rootFolders: FolderWithChildren[] = [];

  // Priority order for sorting
  const priorityOrder: Record<string, number> = {
    URGENT: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1,
  };

  // Create map of all folders
  folders.forEach((folder) => {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      notes: [],
    });
  });

  // Build tree structure
  folders.forEach((folder) => {
    const folderWithChildren = folderMap.get(folder.id);
    if (!folderWithChildren) return;
    if (folder.parentId) {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(folderWithChildren);
      }
    } else {
      rootFolders.push(folderWithChildren);
    }
  });

  // Add notes to folders
  notes.forEach((note) => {
    if (note.folderId) {
      const folder = folderMap.get(note.folderId);
      if (folder) {
        if (!folder.notes) folder.notes = [];
        folder.notes.push(note);
      }
    }
  });

  // Sort folders and notes recursively
  const sortTree = (folders: FolderWithChildren[]) => {
    // Sort folders by name (always alphabetical)
    folders.sort((a, b) => a.name.localeCompare(b.name));

    folders.forEach((folder) => {
      // Recursively sort child folders
      if (folder.children) {
        sortTree(folder.children);
      }

      // Sort notes within each folder using the provided sort parameters
      if (folder.notes) {
        folder.notes.sort((a, b) => {
          let comparison = 0;

          if (sortBy === "name") {
            const aName = (a.title || a.content || "").toLowerCase();
            const bName = (b.title || b.content || "").toLowerCase();
            comparison = aName.localeCompare(bName);
          } else if (sortBy === "created_at") {
            const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            comparison = aDate - bDate;
          } else if (sortBy === "updated_at") {
            const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            comparison = aDate - bDate;
          } else if (sortBy === "priority") {
            const aPriority = priorityOrder[a.priority || "NORMAL"] || 0;
            const bPriority = priorityOrder[b.priority || "NORMAL"] || 0;
            comparison = aPriority - bPriority;
          }

          return sortDirection === "asc" ? comparison : -comparison;
        });
      }
    });
  };

  sortTree(rootFolders);

  return rootFolders;
}

interface NoteTreeItemProps {
  note: NoteItem;
  level: number;
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  isDragging?: boolean;
}

function NoteTreeItem({
  note,
  level,
  selectedNoteId,
  onSelectNote,
  isDragging = false,
}: NoteTreeItemProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingItem,
  } = useDraggable({
    id: `note-${note.id}`,
    data: {
      type: "note",
      noteId: note.id,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;
  const noteLinks = note.noteLinks || [];
  const contactLinks = noteLinks.filter((l) => l.linkType === "Contact");
  const projectLinks = noteLinks.filter((l) => l.linkType === "Project");

  // Fetch contacts and projects for the links
  const { data: contactsData } = useContacts({
    limit: 10000,
    offset: 0,
    includeArchived: true,
  });

  const { data: projects = [] } = useProjects();

  const contacts = contactsData?.contacts || [];

  const contactQueries = useQuery({
    queryKey: ["note-link-contacts", contactLinks.map((l) => l.linkId)],
    queryFn: async () => {
      const results = await Promise.allSettled(
        contactLinks.map((link) =>
          getContactAction({ contactId: link.linkId }).catch(() => null),
        ),
      );
      return results.map((result, index) => {
        const link = contactLinks[index];
        if (!link) return { linkId: "", contact: null };
        return {
          linkId: link.linkId,
          contact:
            result.status === "fulfilled" && result.value?.data?.contact
              ? result.value.data.contact
              : null,
        };
      });
    },
    enabled: contactLinks.length > 0,
  });

  const projectQueries = useQuery({
    queryKey: ["note-link-projects", projectLinks.map((l) => l.linkId)],
    queryFn: async () => {
      const results = await Promise.allSettled(
        projectLinks.map((link) =>
          getProjectAction({ projectId: link.linkId }).catch(() => null),
        ),
      );
      return results.map((result, index) => {
        const link = projectLinks[index];
        if (!link) return { linkId: "", project: null };
        return {
          linkId: link.linkId,
          project:
            result.status === "fulfilled" && result.value?.data?.project
              ? result.value.data.project
              : null,
        };
      });
    },
    enabled: projectLinks.length > 0,
  });

  const linkBadges = useMemo(() => {
    const badges: Array<{
      type: "Contact" | "Project";
      initials: string;
      id: string;
      name: string;
    }> = [];

    // Add contact badges
    contactLinks.forEach((link) => {
      let contact = contacts.find((c) => c.id === link.linkId);
      if (!contact && contactQueries.data) {
        const queryResult = contactQueries.data.find(
          (q: { linkId: string; contact: unknown }) => q.linkId === link.linkId,
        );
        contact = queryResult?.contact || undefined;
      }
      if (contact) {
        badges.push({
          type: "Contact",
          initials: getInitials(`${contact.firstName} ${contact.lastName}`, 2),
          id: link.linkId,
          name: `${contact.firstName} ${contact.lastName}`,
        });
      }
    });

    // Add project badges
    projectLinks.forEach((link) => {
      let project = projects.find((p) => p.id === link.linkId);
      if (!project && projectQueries.data) {
        const queryResult = projectQueries.data.find(
          (q: { linkId: string; project: unknown }) => q.linkId === link.linkId,
        );
        project = queryResult?.project || undefined;
      }
      if (project) {
        badges.push({
          type: "Project",
          initials: getInitials(project.name, 2),
          id: link.linkId,
          name: project.name,
        });
      }
    });

    return badges;
  }, [
    contactLinks,
    projectLinks,
    contacts,
    projects,
    contactQueries.data,
    projectQueries.data,
  ]);

  // Show all badges if 3 or fewer, otherwise show 2 + "+X"
  const visibleBadges =
    linkBadges.length <= 3 ? linkBadges : linkBadges.slice(0, 2);
  const remainingBadges = linkBadges.length > 3 ? linkBadges.slice(2) : [];

  const noteText = note.title || note.content.substring(0, 30);

  // Priority color map for dots
  const priorityDotColorMap: Record<string, string> = {
    URGENT: "bg-red-500",
    HIGH: "bg-yellow-500",
    LOW: "bg-gray-400",
    NORMAL: "bg-blue-500",
  };

  const priorityDotColor = note.priority
    ? priorityDotColorMap[note.priority] || "bg-gray-400"
    : "bg-gray-400";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-grab active:cursor-grabbing w-full text-left",
        selectedNoteId === note.id && "bg-accent",
        (isDragging || isDraggingItem) && "opacity-50",
      )}
      style={{ paddingLeft: `${level * 16 + 24}px`, ...style }}
    >
      <button
        type="button"
        className="flex items-center gap-2 flex-1 min-w-0 justify-start text-left"
        onClick={() => onSelectNote(note.id)}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={cn("h-2 w-2 rounded-full", priorityDotColor)}
            title={note.priority || "NORMAL"}
          />
          <StickyNote className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="flex-1 text-sm truncate text-left">{noteText}</span>
        {linkBadges.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            {visibleBadges.map((badge) => (
              <Tooltip key={`${badge.type}-${badge.id}`}>
                <TooltipTrigger asChild>
                  <Link
                    href={
                      badge.type === "Contact"
                        ? `/contacts/${badge.id}`
                        : `/projects/${badge.id}`
                    }
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0",
                      badge.type === "Contact"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                    )}
                  >
                    {badge.initials}
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{badge.name}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {remainingBadges.length >= 2 && (
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={() => setPopoverOpen(true)}
                    onMouseLeave={() => setPopoverOpen(false)}
                    className={cn(
                      "h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    +{remainingBadges.length}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 p-2"
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={() => setPopoverOpen(true)}
                  onMouseLeave={() => setPopoverOpen(false)}
                >
                  <div className="space-y-1">
                    {linkBadges.map((badge) => (
                      <Link
                        key={`${badge.type}-${badge.id}`}
                        href={
                          badge.type === "Contact"
                            ? `/contacts/${badge.id}`
                            : `/projects/${badge.id}`
                        }
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-sm"
                      >
                        <div
                          className={cn(
                            "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0",
                            badge.type === "Contact"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                          )}
                        >
                          {badge.initials}
                        </div>
                        <span className="flex-1 truncate">{badge.name}</span>
                      </Link>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {remainingBadges.length === 1 && remainingBadges[0] && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={
                      remainingBadges[0].type === "Contact"
                        ? `/contacts/${remainingBadges[0].id}`
                        : `/projects/${remainingBadges[0].id}`
                    }
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0",
                      remainingBadges[0].type === "Contact"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
                    )}
                  >
                    {remainingBadges[0].initials}
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{remainingBadges[0].name}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </button>
    </div>
  );
}

interface TreeNodeProps {
  folder: FolderWithChildren;
  level: number;
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  onSelectNote: (noteId: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onCreateNote: (folderId?: string) => void;
  onCreateFolder: (parentId?: string | null) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  allFolders: FolderWithChildren[];
  onMoveNote?: (noteId: string, folderId: string | null) => void;
  onMoveFolder?: (folderId: string, parentId: string | null) => void;
  activeDragId?: string | null;
  onRenameFolder?: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
}

function TreeNode({
  folder,
  level,
  selectedNoteId,
  selectedFolderId,
  onSelectNote,
  onSelectFolder,
  onCreateNote,
  onCreateFolder,
  expandedFolders,
  onToggleFolder,
  allFolders,
  onMoveNote,
  onMoveFolder,
  activeDragId,
  onRenameFolder,
  onDeleteFolder,
}: TreeNodeProps) {
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const depth = calculateFolderDepth(folder, allFolders);
  const canCreateSubfolder = depth < 2; // Max 3 levels (0, 1, 2)

  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
    data: {
      type: "folder",
      folderId: folder.id,
    },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging: isFolderDragging,
  } = useDraggable({
    id: `folder-drag-${folder.id}`,
    data: {
      type: "folder",
      folderId: folder.id,
    },
    disabled: !onMoveFolder, // Only enable if onMoveFolder is provided
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleCreateNote = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCreateNote(folder.id);
    },
    [folder.id, onCreateNote],
  );

  const handleCreateFolder = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (canCreateSubfolder) {
        onCreateFolder(folder.id);
      }
    },
    [folder.id, onCreateFolder, canCreateSubfolder],
  );

  // Recursively count all notes in this folder and its subfolders
  const countNotesRecursive = useCallback(
    (folderToCount: FolderWithChildren): number => {
      let count = folderToCount.notes?.length || 0;
      if (folderToCount.children) {
        for (const child of folderToCount.children) {
          count += countNotesRecursive(child);
        }
      }
      return count;
    },
    [],
  );

  const totalNoteCount = useMemo(
    () => countNotesRecursive(folder),
    [folder, countNotesRecursive],
  );

  const hasChildren = (folder.children?.length || 0) > 0;
  const hasNotes = (folder.notes?.length || 0) > 0;
  const hasContent = hasChildren || hasNotes;

  // Combine refs for both droppable and draggable
  const combinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      setDragRef(node);
    },
    [setNodeRef, setDragRef],
  );

  // Check if a folder is being dragged over this folder
  const isFolderDragOver =
    isOver &&
    (activeDragId?.startsWith("folder-drag-") ||
      activeDragId?.startsWith("note-"));

  return (
    <div ref={combinedRef}>
      <Collapsible
        open={isExpanded}
        onOpenChange={(open) => {
          // Only toggle if the state needs to change
          if (open !== isExpanded) {
            onToggleFolder(folder.id);
          }
        }}
      >
        <div
          className={cn(
            "group flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-accent w-full transition-colors",
            isSelected && "bg-accent",
            isFolderDragOver && "bg-primary/20 ring-2 ring-primary",
            isFolderDragging && "opacity-50",
          )}
          style={{
            paddingLeft: `${level * 16 + 8}px`,
            ...style,
          }}
        >
          {hasContent ? (
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="h-6 w-6 p-0 shrink-0 flex items-center justify-center rounded-md hover:bg-accent"
              >
                <ChevronRight
                  className={cn(
                    "h-3 w-3 transition-transform",
                    isExpanded && "rotate-90",
                  )}
                />
              </button>
            </CollapsibleTrigger>
          ) : (
            <div className="h-6 w-6 shrink-0" />
          )}
          <button
            type="button"
            className={cn(
              "flex items-center gap-1 flex-1 text-left min-w-0",
              onMoveFolder && "cursor-grab active:cursor-grabbing",
            )}
            {...(onMoveFolder ? { ...attributes, ...listeners } : {})}
            onClick={() => {
              // Only select if not dragging
              if (!isFolderDragging) {
                onSelectFolder(folder.id);
              }
            }}
          >
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">
              {folder.name}
              {totalNoteCount > 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({totalNoteCount})
                </span>
              )}
            </span>
          </button>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {canCreateSubfolder && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleCreateFolder}
                title="Create subfolder"
              >
                <FolderPlus className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleCreateNote}
              title="Create note"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                  title="Folder options"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                {onRenameFolder && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onRenameFolder(folder.id);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                )}
                {onDeleteFolder && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFolder(folder.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {hasContent && (
          <CollapsibleContent>
            <div>
              {folder.children?.map((child) => (
                <TreeNode
                  key={child.id}
                  folder={child}
                  level={level + 1}
                  selectedNoteId={selectedNoteId}
                  selectedFolderId={selectedFolderId}
                  onSelectNote={onSelectNote}
                  onSelectFolder={onSelectFolder}
                  onCreateNote={onCreateNote}
                  onCreateFolder={onCreateFolder}
                  expandedFolders={expandedFolders}
                  onToggleFolder={onToggleFolder}
                  allFolders={allFolders}
                  onMoveNote={onMoveNote}
                  onMoveFolder={onMoveFolder}
                  activeDragId={activeDragId}
                  onRenameFolder={onRenameFolder}
                  onDeleteFolder={onDeleteFolder}
                />
              ))}
              {folder.notes?.map((note) => (
                <NoteTreeItem
                  key={note.id}
                  note={note}
                  level={level + 1}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={onSelectNote}
                  isDragging={activeDragId === `note-${note.id}`}
                />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export function NotesTreeView({
  folders,
  notes,
  recentNotes = [],
  recentlyDeletedNotes = [],
  selectedNoteId,
  selectedFolderId,
  onSelectNote,
  onSelectFolder,
  onCreateNote,
  onCreateFolder,
  expandedFolders,
  onToggleFolder,
  onMoveNote,
  onMoveFolder,
  search = "",
  sortBy = "updated_at",
  sortDirection = "desc",
  priorityFilter = "",
  onRenameFolder,
  onDeleteFolder,
  showFolders = true,
}: NotesTreeViewProps) {
  console.log("notes", notes);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [draggedNote, setDraggedNote] = useState<NoteItem | null>(null);
  const [draggedFolder, setDraggedFolder] = useState<FolderWithChildren | null>(
    null,
  );
  const [recentNotesExpanded, setRecentNotesExpanded] = useState(true);
  const [recentlyDeletedExpanded, setRecentlyDeletedExpanded] = useState(false);

  // Priority order for sorting
  const priorityOrder: Record<string, number> = {
    URGENT: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1,
  };

  // Filter and sort notes
  const filteredAndSortedNotes = useMemo(() => {
    let result = [...notes];

    // Filter by priority
    if (priorityFilter) {
      result = result.filter((note) => note.priority === priorityFilter);
    }

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter((note) => {
        const titleMatch = note.title?.toLowerCase().includes(searchLower);
        const contentMatch = note.content.toLowerCase().includes(searchLower);
        return titleMatch || contentMatch;
      });
    }

    // Sort notes
    result.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "name") {
        const aName = (a.title || a.content || "").toLowerCase();
        const bName = (b.title || b.content || "").toLowerCase();
        comparison = aName.localeCompare(bName);
      } else if (sortBy === "created_at") {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = aDate - bDate;
      } else if (sortBy === "updated_at") {
        const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        comparison = aDate - bDate;
      } else if (sortBy === "priority") {
        const aPriority = priorityOrder[a.priority || "NORMAL"] || 0;
        const bPriority = priorityOrder[b.priority || "NORMAL"] || 0;
        comparison = aPriority - bPriority;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [notes, search, sortBy, sortDirection, priorityFilter]);

  // Filter notes based on search (for folder matching logic)
  const filteredNotes = useMemo(() => {
    if (!search.trim()) return filteredAndSortedNotes;

    const searchLower = search.toLowerCase();
    return filteredAndSortedNotes.filter((note) => {
      const titleMatch = note.title?.toLowerCase().includes(searchLower);
      const contentMatch = note.content.toLowerCase().includes(searchLower);
      return titleMatch || contentMatch;
    });
  }, [filteredAndSortedNotes, search]);

  // Find folders that contain matching notes or have matching names
  const matchingFolderIds = useMemo(() => {
    if (!search.trim()) return new Set<string>();

    const searchLower = search.toLowerCase();
    const folderIds = new Set<string>();

    // Find folders with matching names
    folders.forEach((folder) => {
      if (folder.name.toLowerCase().includes(searchLower)) {
        folderIds.add(folder.id);
        // Also add all parent folders
        let currentFolderId: string | null = folder.id;
        while (currentFolderId) {
          const currentFolder = folders.find((f) => f.id === currentFolderId);
          if (currentFolder?.parentId) {
            folderIds.add(currentFolder.parentId);
            currentFolderId = currentFolder.parentId;
          } else {
            currentFolderId = null;
          }
        }
      }
    });

    // Find folders that contain matching notes
    filteredNotes.forEach((note) => {
      if (note.folderId) {
        folderIds.add(note.folderId);
        // Also add all parent folders
        let currentFolderId: string | null = note.folderId;
        while (currentFolderId) {
          const folder = folders.find((f) => f.id === currentFolderId);
          if (folder?.parentId) {
            folderIds.add(folder.parentId);
            currentFolderId = folder.parentId;
          } else {
            currentFolderId = null;
          }
        }
      }
    });

    return folderIds;
  }, [folders, filteredNotes, search]);

  // Auto-expand folders that contain matching notes when searching
  useEffect(() => {
    if (search.trim() && matchingFolderIds.size > 0) {
      matchingFolderIds.forEach((folderId) => {
        if (!expandedFolders.has(folderId)) {
          onToggleFolder(folderId);
        }
      });
    }
  }, [search, matchingFolderIds, expandedFolders, onToggleFolder]);

  // Filter folders to only show those that match or contain matching notes
  const filteredFolders = useMemo(() => {
    if (!search.trim()) return folders;

    return folders.filter((folder) => {
      // Include folder if it matches by name
      const searchLower = search.toLowerCase();
      if (folder.name.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Include folder if it contains matching notes
      const hasMatchingNotes = filteredNotes.some(
        (note) => note.folderId === folder.id,
      );

      // Include folder if any child folder matches
      const hasMatchingChild = (folderId: string): boolean => {
        const childFolders = folders.filter((f) => f.parentId === folderId);
        return (
          childFolders.some((child) => {
            if (child.name.toLowerCase().includes(searchLower)) return true;
            if (filteredNotes.some((note) => note.folderId === child.id))
              return true;
            return hasMatchingChild(child.id);
          }) || false
        );
      };

      return hasMatchingNotes || hasMatchingChild(folder.id);
    });
  }, [folders, filteredNotes, search]);

  const rootNotes = useMemo(() => {
    // A note is a root note if folderId is falsy (null, undefined, or empty string)
    return filteredAndSortedNotes.filter((note) => !note.folderId);
  }, [filteredAndSortedNotes]);

  const tree = useMemo(
    () =>
      buildTree(filteredFolders, filteredAndSortedNotes, sortBy, sortDirection),
    [filteredFolders, filteredAndSortedNotes, sortBy, sortDirection],
  );

  const handleCreateRootNote = useCallback(() => {
    onCreateNote();
  }, [onCreateNote]);

  const handleCreateRootFolder = useCallback(() => {
    onCreateFolder(null);
  }, [onCreateFolder]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveDragId(event.active.id as string);
      const activeId = event.active.id.toString();
      if (activeId.startsWith("note-")) {
        const noteId = activeId.replace("note-", "");
        // Use all notes (not filtered) to find the note for drag overlay
        const note = notes.find((n) => n.id === noteId);
        setDraggedNote(note || null);
        setDraggedFolder(null);
      } else if (activeId.startsWith("folder-drag-")) {
        const folderId = activeId.replace("folder-drag-", "");
        // Use all folders to find the folder for drag overlay
        const folder = folders.find((f) => f.id === folderId);
        setDraggedFolder(folder || null);
        setDraggedNote(null);
      }
    },
    [notes, folders],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragId(null);
      setDraggedNote(null);
      setDraggedFolder(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Handle note drops
      if (activeId.startsWith("note-") && onMoveNote) {
        const noteId = activeId.replace("note-", "");

        // Handle drop on folder
        if (overId.startsWith("folder-")) {
          const folderId = overId.replace("folder-", "");
          onMoveNote(noteId, folderId);
          return;
        }

        // Handle drop on root (empty area)
        if (overId === "root-drop-zone") {
          onMoveNote(noteId, null);
          return;
        }
      }

      // Handle folder drops
      if (activeId.startsWith("folder-drag-") && onMoveFolder) {
        const folderId = activeId.replace("folder-drag-", "");

        // Prevent moving folder into itself
        if (folderId === overId.replace("folder-", "")) {
          return;
        }

        // Prevent moving folder into its own descendants
        const isDescendant = (
          folderIdToCheck: string,
          potentialAncestorId: string,
        ): boolean => {
          const folderToCheck = folders.find((f) => f.id === folderIdToCheck);
          if (!folderToCheck || !folderToCheck.parentId) return false;
          if (folderToCheck.parentId === potentialAncestorId) return true;
          return isDescendant(folderToCheck.parentId, potentialAncestorId);
        };

        // Handle drop on folder
        if (overId.startsWith("folder-")) {
          const targetFolderId = overId.replace("folder-", "");

          // Check if target is a descendant of the folder being moved
          if (isDescendant(targetFolderId, folderId)) {
            return; // Don't allow moving into descendants
          }

          // Check depth - can't move if target folder is already at max depth
          const targetFolder = folders.find((f) => f.id === targetFolderId);
          if (targetFolder) {
            const targetDepth = calculateFolderDepth(targetFolder, folders);
            if (targetDepth >= 2) {
              return; // Target folder is at max depth
            }
          }

          onMoveFolder(folderId, targetFolderId);
          return;
        }

        // Handle drop on root (empty area)
        if (overId === "root-drop-zone") {
          onMoveFolder(folderId, null);
          return;
        }
      }
    },
    [onMoveNote, onMoveFolder, folders],
  );

  // Root drop zone
  const { setNodeRef: setRootDropRef, isOver: isRootOver } = useDroppable({
    id: "root-drop-zone",
    data: {
      type: "root",
    },
  });

  // Configure sensors to require 5px of movement before starting drag
  // This allows clicks to work normally while still enabling drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-2 border-b">
          <h3 className="text-sm font-semibold">Notes</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleCreateRootFolder}
              title="Create folder"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleCreateRootNote}
              title="Create note"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div
          ref={setRootDropRef}
          className={cn(
            "flex-1 overflow-y-auto p-2 transition-colors",
            isRootOver &&
              (activeDragId?.startsWith("note-") ||
                activeDragId?.startsWith("folder-drag-")) &&
              "bg-primary/10",
          )}
        >
          {showFolders ? (
            tree.length === 0 && rootNotes.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <p className="mb-2">No notes or folders yet</p>
                <p className="text-xs">
                  Create a note or folder to get started
                </p>
              </div>
            ) : (
              <>
                {tree.map((folder) => (
                  <TreeNode
                    key={folder.id}
                    folder={folder}
                    level={0}
                    selectedNoteId={selectedNoteId}
                    selectedFolderId={selectedFolderId}
                    onSelectNote={onSelectNote}
                    onSelectFolder={onSelectFolder}
                    onCreateNote={onCreateNote}
                    onCreateFolder={onCreateFolder}
                    expandedFolders={expandedFolders}
                    onToggleFolder={onToggleFolder}
                    allFolders={folders}
                    onMoveNote={onMoveNote}
                    onMoveFolder={onMoveFolder}
                    activeDragId={activeDragId}
                    onRenameFolder={onRenameFolder}
                    onDeleteFolder={onDeleteFolder}
                  />
                ))}
                {rootNotes.map((note) => (
                  <NoteTreeItem
                    key={note.id}
                    note={note}
                    level={0}
                    selectedNoteId={selectedNoteId}
                    onSelectNote={onSelectNote}
                    isDragging={activeDragId === `note-${note.id}`}
                  />
                ))}
              </>
            )
          ) : filteredAndSortedNotes.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p className="mb-2">No notes found</p>
              <p className="text-xs">Create a note to get started</p>
            </div>
          ) : (
            filteredAndSortedNotes.map((note) => (
              <NoteTreeItem
                key={note.id}
                note={note}
                level={0}
                selectedNoteId={selectedNoteId}
                onSelectNote={onSelectNote}
                isDragging={activeDragId === `note-${note.id}`}
              />
            ))
          )}
        </div>
        {recentNotes.length > 0 && (
          <div className="border-t border-border">
            <Collapsible
              open={recentNotesExpanded}
              onOpenChange={setRecentNotesExpanded}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-2 border-b border-border hover:bg-accent transition-colors"
                >
                  <h3 className="text-sm font-semibold">Recent Notes</h3>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      recentNotesExpanded && "rotate-90",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="max-h-48 overflow-y-auto p-2">
                  <div className="space-y-1">
                    {recentNotes.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => onSelectNote(note.id)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors",
                          selectedNoteId === note.id && "bg-accent",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <StickyNote className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-medium">
                              {note.title ||
                                note.content.substring(0, 40) ||
                                "Untitled"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
        {recentlyDeletedNotes.length > 0 && (
          <div className="border-t border-border">
            <Collapsible
              open={recentlyDeletedExpanded}
              onOpenChange={setRecentlyDeletedExpanded}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-2 border-b border-border hover:bg-accent transition-colors"
                >
                  <h3 className="text-sm font-semibold">Recently Deleted</h3>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      recentlyDeletedExpanded && "rotate-90",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="max-h-48 overflow-y-auto p-2">
                  <div className="space-y-1">
                    {recentlyDeletedNotes.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => onSelectNote(note.id)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors",
                          selectedNoteId === note.id && "bg-accent",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <Trash2 className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-medium">
                              {note.title ||
                                note.content.substring(0, 40) ||
                                "Untitled"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
      <DragOverlay>
        {draggedNote ? (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-accent border border-border shadow-lg">
            <StickyNote className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm">
              {draggedNote.title || draggedNote.content.substring(0, 30)}
            </span>
          </div>
        ) : draggedFolder ? (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-accent border border-border shadow-lg">
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm">{draggedFolder.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
