"use client";

import type { Project } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import {
  CompactTable,
  CompactTableBody,
  CompactTableCell,
  CompactTableHead,
  CompactTableHeader,
  CompactTableRow,
} from "@/features/shared/components/ui/compact-table";
import { useUserProjects } from "../hooks/use-user-projects";

interface UserProjectsTableProps {
  userId: string;
}

export function UserProjectsTable({ userId }: UserProjectsTableProps) {
  const { data: projects, isLoading, error } = useUserProjects(userId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Projects</CardTitle>
          <CardDescription>Projects owned by this user</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Projects</CardTitle>
          <CardDescription>Projects owned by this user</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load projects"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle>User Projects</CardTitle>
          <CardDescription>Projects owned by this user</CardDescription>
        </CardHeader>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No projects found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>User Projects</CardTitle>
        <CardDescription>
          {projects.length} project{projects.length !== 1 ? "s" : ""} owned by
          this user
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <CompactTable>
          <CompactTableHeader className="border-b border-border">
            <CompactTableRow>
              <CompactTableHead>Name</CompactTableHead>
              <CompactTableHead>Description</CompactTableHead>
              <CompactTableHead>Created</CompactTableHead>
              <CompactTableHead>Updated</CompactTableHead>
              <CompactTableHead className="text-right">
                Actions
              </CompactTableHead>
            </CompactTableRow>
          </CompactTableHeader>
          <CompactTableBody>
            {projects.map((project: Project) => (
              <CompactTableRow key={project.id}>
                <CompactTableCell className="font-medium">
                  {project.name}
                </CompactTableCell>
                <CompactTableCell className="max-w-md">
                  <p className="truncate text-muted-foreground">
                    {project.description || "-"}
                  </p>
                </CompactTableCell>
                <CompactTableCell className="text-muted-foreground">
                  {new Date(project.createdAt).toLocaleDateString()}
                </CompactTableCell>
                <CompactTableCell className="text-muted-foreground">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </CompactTableCell>
                <CompactTableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/projects/${project.id}`}>View / Edit</Link>
                  </Button>
                </CompactTableCell>
              </CompactTableRow>
            ))}
          </CompactTableBody>
        </CompactTable>
      </CardContent>
    </Card>
  );
}
