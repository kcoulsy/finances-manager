import { requireAuth } from "@/features/shared/lib/auth/require-auth";
import { ProjectDetail } from "@/features/projects/components/project-detail";
import { Button } from "@/features/shared/components/ui/button";
import Link from "next/link";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  await requireAuth();
  const { id } = await params;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Details</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your project
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>

      <ProjectDetail projectId={id} />
    </div>
  );
}

