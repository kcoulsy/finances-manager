import { UsersList } from "@/features/admin/components/users-list";
import { UserRole } from "@/features/auth/constants/roles";
import { requireRole } from "@/features/auth/lib/require-role";

export default async function AdminUsersPage() {
  await requireRole(UserRole.ADMIN);

  return (
    <div className="space-y-8 w-full min-w-0 max-w-full overflow-hidden">
      <div>
        <h1 className="text-3xl font-bold">Admin - Users</h1>
        <p className="text-muted-foreground mt-2">
          Manage all users and their roles
        </p>
      </div>

      <UsersList />
    </div>
  );
}
