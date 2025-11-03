import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { requireNoAuth } from "@/features/shared/lib/auth/require-auth";

export default async function ResetPasswordPage() {
  await requireNoAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ResetPasswordForm />
    </div>
  );
}
