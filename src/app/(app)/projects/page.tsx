import { requireAuth } from "@/features/shared/lib/auth/require-auth";
import { getProjectsAction } from "@/features/projects/actions/get-projects.action";
import { ProjectsList } from "@/features/projects/components/projects-list";

export default async function ProjectsPage() {
  const session = await requireAuth();

  const result = await getProjectsAction();

  const projects = result?.data?.success ? result.data.projects : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Projects</h1>
        <p className="text-muted-foreground mt-2">
          Manage your projects
        </p>
      </div>

      <ProjectsList projects={projects} />
    </div>
  );
}

