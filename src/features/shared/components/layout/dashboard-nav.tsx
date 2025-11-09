import { Separator } from "@/features/shared/components/ui/separator";
import { SidebarTrigger } from "@/features/shared/components/ui/sidebar";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";
import { AppBreadcrumbs } from "./app-breadcrumbs";
import { UserNav } from "./user-nav";

export async function DashboardNav() {
  const session = await requireAuth();

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 items-center gap-4">
        <AppBreadcrumbs />
        <div className="flex flex-1 items-center justify-end gap-4">
          <UserNav
            user={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image,
            }}
          />
        </div>
      </div>
    </header>
  );
}
