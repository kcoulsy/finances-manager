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

          {children}
          <Toaster
            richColors
            position="top-right"
            closeButton
            offset={{
              top: "5rem",
            }}
          />
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
