import { ContentLayout } from "@/features/shared/components/layout/content-layout";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";
import { getUserCurrency } from "@/features/shared/lib/utils/get-user-currency";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await requireAuth();
  const currency = await getUserCurrency();

  return (
    <ContentLayout>
      <DashboardClient
        defaultCurrency={currency}
        userName={session.user.name || "User"}
      />
    </ContentLayout>
  );
}
