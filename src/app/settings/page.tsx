import { requireAuth } from "@/features/shared/lib/auth/require-auth";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { DeleteAccountForm } from "@/features/auth/components/delete-account-form";
import { Button } from "@/features/shared/components/ui/button";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await requireAuth();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your account settings</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>

        <div className="space-y-6">
          <ChangePasswordForm />
          <DeleteAccountForm />
        </div>
      </div>
    </div>
  );
}

