import { getProjectAction } from "../actions/get-project.action";
import { ProjectDetailView } from "./project-detail-view";
import { Card, CardContent } from "@/features/shared/components/ui/card";

interface ProjectDetailProps {
  projectId: string;
}

export async function ProjectDetail({ projectId }: ProjectDetailProps) {
  const result = await getProjectAction({ projectId });

  if (result?.serverError || !result?.data?.success) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-destructive">
            {result?.serverError || "Failed to load project"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <ProjectDetailView project={result.data.project} />;
}

