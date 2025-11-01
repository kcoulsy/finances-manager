import { getProjectAction } from "../actions/get-project.action";
import { ProjectDetailView } from "./project-detail-view";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/features/shared/components/ui/card";

interface ProjectDetailProps {
  projectId: string;
}

export async function ProjectDetail({ projectId }: ProjectDetailProps) {
  const result = await getProjectAction({ projectId });

  if (result?.serverError || !result?.data?.success) {
    const errorMessage = result?.serverError || "Failed to load project";

    // Check if it's a permission error
    if (
      errorMessage.includes("Forbidden") ||
      errorMessage.includes("requires") ||
      errorMessage.includes("permission")
    ) {
      // Project permissions are not admin permissions, so redirect to unauthorized
      throw redirect(`/unauthorized`);
    }

    // For other errors, show error message
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-destructive">{errorMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return <ProjectDetailView project={result.data.project} />;
}
