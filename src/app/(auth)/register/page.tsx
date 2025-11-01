import { requireNoAuth } from "@/features/shared/lib/auth/require-auth";
import { RegisterForm } from "@/features/auth/components/register-form";

export default async function RegisterPage() {
  await requireNoAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <RegisterForm />
    </div>
  );
}
