import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { requireNoAuth } from "@/features/shared/lib/auth/require-auth";

export default async function ForgotPasswordPage() {
  await requireNoAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ForgotPasswordForm />
    </div>
  );
}
