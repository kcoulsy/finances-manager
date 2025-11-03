import { LoginForm } from "@/features/auth/components/login-form";
import { requireNoAuth } from "@/features/shared/lib/auth/require-auth";

export default async function LoginPage() {
  await requireNoAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <LoginForm />
    </div>
  );
}
