import { ContentLayout } from "@/features/shared/components/layout/content-layout";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";
import { getUserCurrency } from "@/features/shared/lib/utils/get-user-currency";
import { AccountsList } from "@/features/accounts/components/accounts-list";

export default async function AccountsPage() {
  const session = await requireAuth();
  const currency = await getUserCurrency();

  return (
    <ContentLayout className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Accounts</h1>
        <p className="text-muted-foreground mt-2">
          Manage your bank accounts and track balances
        </p>
      </div>

      <AccountsList defaultCurrency={currency} />
    </ContentLayout>
  );
}

