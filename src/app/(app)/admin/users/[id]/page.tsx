import { requireRole } from "@/features/auth/lib/require-role";
import { UserRole } from "@/features/auth/constants/roles";
import { UserDetail } from "@/features/admin/components/user-detail";
import { Button } from "@/features/shared/components/ui/button";
import Link from "next/link";

interface AdminUserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailPageProps) {
  await requireRole(UserRole.ADMIN);
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Details</h1>
          <p className="text-muted-foreground mt-2">
            View and manage user information and roles
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/users">Back to Users</Link>
        </Button>
      </div>

      <UserDetail userId={id} />
    </div>
  );
}

