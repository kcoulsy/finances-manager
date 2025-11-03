"use client";

import type { Project } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { DeleteProjectForm } from "./delete-project-form";
import { ProjectForm } from "./project-form";

interface ProjectDetailViewProps {
  project: Project;
}

export function ProjectDetailView({ project }: ProjectDetailViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => setIsEditing(false)}>
          Cancel Editing
        </Button>
        <ProjectForm
          projectId={project.id}
          initialData={{
            name: project.name,
            description: project.description,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>View and manage your project</CardDescription>
            </div>
            <Button variant="outline" onClick={() => router.push("/projects")}>
              Back to Projects
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Project Name</p>
              <p className="font-medium text-lg">{project.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Project ID</p>
              <p className="font-mono text-sm">{project.id}</p>
            </div>
            {project.description && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground mb-1">
                  Description
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created At</p>
              <p className="text-sm">
                {new Date(project.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Updated At</p>
              <p className="text-sm">
                {new Date(project.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={() => setIsEditing(true)}>Edit Project</Button>
          </div>
        </CardContent>
      </Card>

      <DeleteProjectForm projectId={project.id} />
    </div>
  );
}
