"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useDeleteProject } from "../hooks/use-delete-project";
import { deleteProjectSchema } from "../schemas/project.schema";
import type { DeleteProjectInput } from "../schemas/project.schema";
import { Button } from "@/features/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/features/shared/components/ui/card";

interface DeleteProjectFormProps {
  projectId: string;
}

export function DeleteProjectForm({ projectId }: DeleteProjectFormProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteProject = useDeleteProject();

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<DeleteProjectInput>({
    resolver: zodResolver(deleteProjectSchema),
    defaultValues: {
      projectId,
    },
  });

  const onSubmit = async (data: DeleteProjectInput) => {
    if (!confirmDelete) {
      setError("root", {
        message: "Please confirm deletion by checking the checkbox",
      });
      return;
    }

    try {
      await deleteProject.mutateAsync(data);
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Failed to delete project",
      });
    }
  };

  const isLoading = isSubmitting || deleteProject.isPending;

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Delete Project</CardTitle>
        <CardDescription>
          This action cannot be undone. This will permanently delete your project.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {errors.root && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.root.message}
            </div>
          )}
          <div className="flex items-center space-x-2">
            <input
              id="confirmDelete"
              type="checkbox"
              checked={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="confirmDelete" className="text-sm font-medium cursor-pointer">
              I understand this action cannot be undone
            </label>
          </div>
        </CardContent>
        <CardFooter className="mt-6">
          <Button
            type="submit"
            variant="destructive"
            disabled={isLoading || !confirmDelete}
          >
            {isLoading ? "Deleting..." : "Delete Project"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

