import { Toaster } from "sonner";
import { UserRole } from "@/features/auth/constants/roles";
import { AppSidebar } from "@/features/shared/components/layout/app-sidebar";
import { BreadcrumbProvider } from "@/features/shared/components/layout/breadcrumb-context";
import { DashboardNav } from "@/features/shared/components/layout/dashboard-nav";
import {
  SidebarInset,
  SidebarProvider,
} from "@/features/shared/components/ui/sidebar";
import { hasRole } from "@/features/shared/lib/auth/has-role";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await hasRole(UserRole.ADMIN);

  return (
    <SidebarProvider>
      <AppSidebar isAdmin={isAdmin} />
      <SidebarInset className="min-w-0">
        <BreadcrumbProvider>
          <DashboardNav />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8 min-w-0 max-w-full overflow-hidden">
            {children}
          </div>

          <Toaster richColors />
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
