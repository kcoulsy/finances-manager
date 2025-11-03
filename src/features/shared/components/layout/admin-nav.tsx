"use client";

import { ChevronDown, Mail, Shield, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/features/shared/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/features/shared/components/ui/sidebar";

interface AdminNavProps {
  isAdmin: boolean;
}

export function AdminNav({ isAdmin }: AdminNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(
    pathname?.startsWith("/admin") ?? false,
  );

  React.useEffect(() => {
    setOpen(pathname?.startsWith("/admin") ?? false);
  }, [pathname]);

  if (!isAdmin) {
    return null;
  }

  const adminItems = [
    {
      title: "Users",
      url: "/admin/users",
      icon: Users,
    },
    {
      title: "Email Logs",
      url: "/admin/email-logs",
      icon: Mail,
    },
  ];

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip="Admin">
              <Shield className="size-4" />
              <span>Admin</span>
              <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.url ||
                      pathname?.startsWith(`${item.url}/`)
                    }
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
