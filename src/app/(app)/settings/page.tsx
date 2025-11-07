import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { DeleteAccountForm } from "@/features/auth/components/delete-account-form";
import { ContentLayout } from "@/features/shared/components/layout/content-layout";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";

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
        <ChangePasswordForm />
        <DeleteAccountForm />
      </div>
    </ContentLayout>
  );
}
