"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { Input } from "@/features/shared/components/ui/input";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { useCreateProject } from "../hooks/use-create-project";
import { useUpdateProject } from "../hooks/use-update-project";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "../schemas/project.schema";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../schemas/project.schema";

interface ProjectFormProps {
  projectId?: string;
  initialData?: {
    name: string;
    description?: string | null;
  };
}

export function ProjectForm({ projectId, initialData }: ProjectFormProps) {
  const isEdit = !!projectId;
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateProjectInput | UpdateProjectInput>({
    resolver: zodResolver(isEdit ? updateProjectSchema : createProjectSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description || undefined,
          ...(isEdit ? { projectId } : {}),
        }
      : undefined,
  });

  const onSubmit = async (data: CreateProjectInput | UpdateProjectInput) => {
    try {
      if (isEdit) {
        await updateProject.mutateAsync(data as UpdateProjectInput);
      } else {
        await createProject.mutateAsync(data as CreateProjectInput);
      }
      // Toast is shown automatically by the hooks via showToastFromAction
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to save project",
      });
    }
  };

  const isLoading =
    isSubmitting || createProject.isPending || updateProject.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Project" : "Create New Project"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Update your project details"
            : "Add a new project to your workspace"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {errors.root && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.root.message}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Project Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              placeholder="My Project"
              disabled={isLoading}
              aria-invalid={errors.name ? "true" : "false"}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Describe your project..."
              disabled={isLoading}
              aria-invalid={errors.description ? "true" : "false"}
              rows={4}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
                ? "Update Project"
                : "Create Project"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
