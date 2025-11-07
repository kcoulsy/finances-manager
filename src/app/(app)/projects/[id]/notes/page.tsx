import { ProjectNotesPageClient } from "@/features/notes/components/project-notes-page-client";
import { getProjectAction } from "@/features/projects/actions/get-project.action";
import { SetBreadcrumbs } from "@/features/shared/components/layout/set-breadcrumbs";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";

interface ProjectNotesPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectNotesPage({
  params,
}: ProjectNotesPageProps) {
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
        { label: "Notes" },
      ]}
    >
      <ProjectNotesPageClient
        projectId={id}
        projectName={project?.name || "Project"}
      />
    </SetBreadcrumbs>
  );
}
