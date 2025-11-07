import { NotesPageClient } from "@/features/notes/components/notes-page-client";
import { SetBreadcrumbs } from "@/features/shared/components/layout/set-breadcrumbs";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";

export default async function NotesPage() {
  await requireAuth();

  return (
    <SetBreadcrumbs breadcrumbs={[{ label: "Notes" }]}>
      <NotesPageClient />
    </SetBreadcrumbs>
  );
}
