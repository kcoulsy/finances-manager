import { requireAuth } from "@/features/shared/lib/auth/require-auth";
import { ProjectForm } from "@/features/projects/components/project-form";
import { Button } from "@/features/shared/components/ui/button";
import Link from "next/link";

export default async function NewProjectPage() {
  await requireAuth();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">New Project</h1>
          <p className="text-muted-foreground mt-2">Create a new project</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>

      <ProjectForm />
    </div>
  );
}
