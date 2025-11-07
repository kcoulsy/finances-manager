"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { getContactAction } from "@/features/contacts/actions/get-contact.action";
import { useContacts } from "@/features/contacts/hooks/use-contacts";
import { getProjectAction } from "@/features/projects/actions/get-project.action";
import { useProjects } from "@/features/projects/hooks/use-projects";

interface NoteLink {
  id: string;
  linkType: "Contact" | "Project";
  linkId: string;
}

interface NoteLinksDisplayProps {
  noteLinks: NoteLink[];
}

export function NoteLinksDisplay({ noteLinks }: NoteLinksDisplayProps) {
  // Fetch all contacts including archived ones
  const { data: contactsData } = useContacts({
    limit: 10000,
    offset: 0,
    includeArchived: true,
  });

  const { data: projects = [] } = useProjects();

  const contacts = contactsData?.contacts || [];

  // Fetch individual contacts/projects for links that aren't in the bulk list
  const contactQueries = useQuery({
    queryKey: [
      "note-link-contacts",
      noteLinks.filter((l) => l.linkType === "Contact").map((l) => l.linkId),
    ],
    queryFn: async () => {
      const contactLinks = noteLinks.filter((l) => l.linkType === "Contact");
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
    enabled: noteLinks.some((l) => l.linkType === "Contact"),
  });

  const projectQueries = useQuery({
    queryKey: [
      "note-link-projects",
      noteLinks.filter((l) => l.linkType === "Project").map((l) => l.linkId),
    ],
    queryFn: async () => {
      const projectLinks = noteLinks.filter((l) => l.linkType === "Project");
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
    enabled: noteLinks.some((l) => l.linkType === "Project"),
  });

  const linkData = useMemo(() => {
    return noteLinks.map((link) => {
      if (link.linkType === "Contact") {
        // First try to find in bulk contacts list
        let contact = contacts.find((c) => c.id === link.linkId);

        // If not found, try individual query results
        if (!contact && contactQueries.data) {
          const queryResult = contactQueries.data.find(
            (q) => q.linkId === link.linkId,
          );
          contact = queryResult?.contact || undefined;
        }

        return {
          ...link,
          name: contact
            ? `${contact.firstName} ${contact.lastName}`
            : "Unknown Contact",
          href: `/contacts/${link.linkId}`,
          type: "Contact" as const,
        };
      } else {
        // First try to find in bulk projects list
        let project = projects.find((p) => p.id === link.linkId);

        // If not found, try individual query results
        if (!project && projectQueries.data) {
          const queryResult = projectQueries.data.find(
            (q) => q.linkId === link.linkId,
          );
          project = queryResult?.project || undefined;
        }

        return {
          ...link,
          name: project?.name || "Unknown Project",
          href: `/projects/${link.linkId}`,
          type: "Project" as const,
        };
      }
    });
  }, [noteLinks, contacts, projects, contactQueries.data, projectQueries.data]);

  if (linkData.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {linkData.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors
            ${
              link.type === "Contact"
                ? "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                : "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800"
            }
          `}
        >
          <span>{link.name}</span>
        </Link>
      ))}
    </div>
  );
}
