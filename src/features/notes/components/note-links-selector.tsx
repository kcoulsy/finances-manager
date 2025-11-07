"use client";

import { Search, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useContacts } from "@/features/contacts/hooks/use-contacts";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/features/shared/components/ui/popover";
import { cn } from "@/features/shared/lib/utils/index";
import type { NoteLinkInput } from "../schemas/note.schema";

interface NoteLinksSelectorProps {
  value: NoteLinkInput[];
  onChange: (links: NoteLinkInput[]) => void;
  disabled?: boolean;
}

export function NoteLinksSelector({
  value,
  onChange,
  disabled = false,
}: NoteLinksSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: contactsData } = useContacts({
    limit: 100,
    offset: 0,
    includeArchived: false,
  });

  const { data: projects = [] } = useProjects();

  const contacts = contactsData?.contacts || [];

  const selectedContactIds = useMemo(
    () =>
      new Set(
        value
          .filter((link) => link.linkType === "Contact")
          .map((link) => link.linkId),
      ),
    [value],
  );

  const selectedProjectIds = useMemo(
    () =>
      new Set(
        value
          .filter((link) => link.linkType === "Project")
          .map((link) => link.linkId),
      ),
    [value],
  );

  const handleAddContact = useCallback(
    (contactId: string) => {
      if (!selectedContactIds.has(contactId)) {
        onChange([...value, { linkType: "Contact", linkId: contactId }]);
      }
      setOpen(false);
      setSearch("");
    },
    [value, selectedContactIds, onChange],
  );

  const handleAddProject = useCallback(
    (projectId: string) => {
      if (!selectedProjectIds.has(projectId)) {
        onChange([...value, { linkType: "Project", linkId: projectId }]);
      }
      setOpen(false);
      setSearch("");
    },
    [value, selectedProjectIds, onChange],
  );

  const handleRemoveLink = useCallback(
    (linkType: "Contact" | "Project", linkId: string) => {
      onChange(
        value.filter(
          (link) => !(link.linkType === linkType && link.linkId === linkId),
        ),
      );
    },
    [value, onChange],
  );

  const filteredContacts = useMemo(() => {
    if (!search) return contacts;
    const searchLower = search.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.firstName.toLowerCase().includes(searchLower) ||
        contact.lastName.toLowerCase().includes(searchLower) ||
        contact.email.toLowerCase().includes(searchLower),
    );
  }, [contacts, search]);

  const filteredProjects = useMemo(() => {
    if (!search) return projects;
    const searchLower = search.toLowerCase();
    return projects.filter((project) =>
      project.name.toLowerCase().includes(searchLower),
    );
  }, [projects, search]);

  const selectedContacts = useMemo(
    () => contacts.filter((contact) => selectedContactIds.has(contact.id)),
    [contacts, selectedContactIds],
  );

  const selectedProjects = useMemo(
    () => projects.filter((project) => selectedProjectIds.has(project.id)),
    [projects, selectedProjectIds],
  );

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Links</div>

      {/* Selected Links as Badges */}
      {(selectedContacts.length > 0 || selectedProjects.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {selectedContacts.map((contact) => (
            <div
              key={`Contact-${contact.id}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              <span>
                {contact.firstName} {contact.lastName}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveLink("Contact", contact.id)}
                  className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                  aria-label={`Remove ${contact.firstName} ${contact.lastName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {selectedProjects.map((project) => (
            <div
              key={`Project-${project.id}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
            >
              <span>{project.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveLink("Project", project.id)}
                  className="ml-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5"
                  aria-label={`Remove ${project.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Link Button */}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <span>+ Add Link</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts or projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {/* Contacts Section */}
              {filteredContacts.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                    Contacts
                  </div>
                  <div className="space-y-1">
                    {filteredContacts.map((contact) => (
                      <button
                        key={`Contact-${contact.id}`}
                        type="button"
                        onClick={() => handleAddContact(contact.id)}
                        disabled={selectedContactIds.has(contact.id)}
                        className={cn(
                          "w-full text-left px-2 py-2 rounded-md hover:bg-accent transition-colors",
                          selectedContactIds.has(contact.id) &&
                            "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {contact.firstName} {contact.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {contact.email}
                            </span>
                          </div>
                          {selectedContactIds.has(contact.id) && (
                            <span className="text-xs text-muted-foreground">
                              Added
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects Section */}
              {filteredProjects.length > 0 && (
                <div className="p-2 border-t">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                    Projects
                  </div>
                  <div className="space-y-1">
                    {filteredProjects.map((project) => (
                      <button
                        key={`Project-${project.id}`}
                        type="button"
                        onClick={() => handleAddProject(project.id)}
                        disabled={selectedProjectIds.has(project.id)}
                        className={cn(
                          "w-full text-left px-2 py-2 rounded-md hover:bg-accent transition-colors",
                          selectedProjectIds.has(project.id) &&
                            "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {project.name}
                          </span>
                          {selectedProjectIds.has(project.id) && (
                            <span className="text-xs text-muted-foreground">
                              Added
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredContacts.length === 0 &&
                filteredProjects.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No results found.
                  </div>
                )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
