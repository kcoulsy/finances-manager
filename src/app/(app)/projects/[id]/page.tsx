import { requireAuth } from "@/features/shared/lib/auth/require-auth";
import { getProjectAction } from "@/features/projects/actions/get-project.action";
import { ProjectDetail } from "@/features/projects/components/project-detail";
import { SetBreadcrumbs } from "@/features/shared/components/layout/set-breadcrumbs";
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

  // Fetch project to get the name for breadcrumbs
  const result = await getProjectAction({ projectId: id });
  const project = result?.data?.success ? result.data.project : null;

  return (
    <SetBreadcrumbs
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: project?.name || "Project" },
      ]}
    >
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
    </SetBreadcrumbs>
  );
}

