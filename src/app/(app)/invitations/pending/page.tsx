import { PendingInvitationsPageClient } from "@/features/projects/components/pending-invitations-page-client";
import { ContentLayout } from "@/features/shared/components/layout/content-layout";
import { SetBreadcrumbs } from "@/features/shared/components/layout/set-breadcrumbs";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";

export default async function PendingInvitationsPage() {
  await requireAuth();

  return (
    <SetBreadcrumbs breadcrumbs={[{ label: "Pending Invitations" }]}>
      <ContentLayout>
        <PendingInvitationsPageClient />
      </ContentLayout>
    </SetBreadcrumbs>
  );
}
