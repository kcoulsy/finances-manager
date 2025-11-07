import { UserRole } from "@/features/auth/constants/roles";
import { requireRole } from "@/features/auth/lib/require-role";
import { EmailLogsPageClient } from "@/features/email-logs/components/email-logs-page-client";
import { ContentLayout } from "@/features/shared/components/layout/content-layout";

export default async function AdminEmailLogsPage() {
  await requireRole(UserRole.ADMIN);

  return (
    <div>
      <div className="p-8">
        <h1 className="text-3xl font-bold">Admin - Email Logs</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all email logs sent from the system
        </p>
      </div>

      <EmailLogsPageClient />
    </div>
  );
}
