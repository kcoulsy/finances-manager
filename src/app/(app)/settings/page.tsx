import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { DeleteAccountForm } from "@/features/auth/components/delete-account-form";
import { CurrencySelector } from "@/features/settings/components/currency-selector";
import { CategoriesManager } from "@/features/settings/components/categories-manager";
import { ContentLayout } from "@/features/shared/components/layout/content-layout";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";
import { AccountsExportImport } from "@/features/accounts/components/accounts-export-import";
import { TransactionsExportImport } from "@/features/transactions/components/transactions-export-import";

export default async function SettingsPage() {
  await requireAuth();

  return (
    <ContentLayout className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings
        </p>
      </div>

      <div className="space-y-6">
        <CurrencySelector />
        <CategoriesManager />
        <AccountsExportImport />
        <TransactionsExportImport />
        <ChangePasswordForm />
        <DeleteAccountForm />
      </div>
    </ContentLayout>
  );
}
