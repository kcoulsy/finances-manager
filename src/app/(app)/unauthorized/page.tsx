import { ContentLayout } from "@/features/shared/components/layout/content-layout";
import { Unauthorized as UnauthorizedComponent } from "@/features/shared/components/layout/unauthorized";

export default async function UnauthorizedPage() {
  return (
    <ContentLayout>
      <UnauthorizedComponent />
    </ContentLayout>
  );
}
