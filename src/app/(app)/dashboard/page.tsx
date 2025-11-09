import { ContentLayout } from "@/features/shared/components/layout/content-layout";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";
import { DetectTransfersButton } from "@/features/transactions/components/detect-transfers-button";
import { ImportTransactionsDialog } from "@/features/transactions/components/import-transactions-dialog";
import { TransactionsList } from "@/features/transactions/components/transactions-list";

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <ContentLayout className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {session.user.name}!
          </p>
        </div>
        <div className="flex gap-2">
          <ImportTransactionsDialog />
          <DetectTransfersButton />
        </div>
      </div>

      <TransactionsList />
    </ContentLayout>
  );
}
