import { getProjectAction } from "@/features/projects/actions/get-project.action";
import { ProjectUsersPageClient } from "@/features/projects/components/project-users-page-client";
import { ContentLayout } from "@/features/shared/components/layout/content-layout";
import { SetBreadcrumbs } from "@/features/shared/components/layout/set-breadcrumbs";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";

interface ProjectUsersPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectUsersPage({
  params,
}: ProjectUsersPageProps) {
  await requireAuth();
  const { id } = await params;

  // Fetch project to get the name and owner for breadcrumbs
  const result = await getProjectAction({ projectId: id });
  const project = result?.data?.success ? result.data.project : null;

  return (
    <SetBreadcrumbs
      breadcrumbs={[
        { label: "Projects", href: "/projects" },
        { label: project?.name || "Project", href: `/projects/${id}` },
        { label: "Users" },
      ]}
    >
      <ContentLayout>
        <ProjectUsersPageClient
          projectId={id}
          projectName={project?.name || "Project"}
          projectOwnerId={project?.userId}
        />
      </ContentLayout>
    </SetBreadcrumbs>
  );
}
