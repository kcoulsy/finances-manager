import { UserRole } from "@/features/auth/constants/roles";
import { requireRole } from "@/features/auth/lib/require-role";
import { EmailLogsPageClient } from "@/features/email-logs/components/email-logs-page-client";

export default async function AdminEmailLogsPage() {
  await requireRole(UserRole.ADMIN);

  return (
    <div className="space-y-8 w-full min-w-0 max-w-full overflow-hidden">
      <div>
        <h1 className="text-3xl font-bold">Admin - Email Logs</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all email logs sent from the system
        </p>
      </div>

      <EmailLogsPageClient />
    </div>
  );
}
