import { AppSidebar } from "@/features/shared/components/layout/app-sidebar";
import { DashboardNav } from "@/features/shared/components/layout/dashboard-nav";
import { BreadcrumbProvider } from "@/features/shared/components/layout/breadcrumb-context";
import { SidebarInset, SidebarProvider } from "@/features/shared/components/ui/sidebar";
import { hasRole } from "@/features/shared/lib/auth/has-role";
import { UserRole } from "@/features/auth/constants/roles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await hasRole(UserRole.ADMIN);

  return (
    <SidebarProvider>
      <AppSidebar isAdmin={isAdmin} />
      <SidebarInset>
        <BreadcrumbProvider>
          <DashboardNav />
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}

