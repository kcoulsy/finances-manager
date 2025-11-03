import { getProjectAction } from "@/features/projects/actions/get-project.action";
import { SetBreadcrumbs } from "@/features/shared/components/layout/set-breadcrumbs";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";

interface ProjectDashboardPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDashboardPage({
  params,
}: ProjectDashboardPageProps) {
  await requireAuth();
  const { id } = await params;

  // Fetch project to get the name for breadcrumbs
  const result = await getProjectAction({ projectId: id });
  const project = result?.data?.success ? result.data.project : null;

  return (
    <SetBreadcrumbs
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: project?.name || "Project", href: `/projects/${id}` },
        { label: "Dashboard" },
      ]}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Project Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview and activity for {project?.name || "this project"}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Dashboard content will go here */}
        </div>
      </div>
    </SetBreadcrumbs>
  );
}
