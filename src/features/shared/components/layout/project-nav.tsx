"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  ChevronDown,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/features/shared/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/features/shared/components/ui/collapsible";

export function ProjectNav() {
  const pathname = usePathname();

  // Extract project ID from pathname (/projects/[id]/...)
  const projectMatch = pathname?.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1];

  // Check if we're inside a project route
  const isInProject = projectId !== undefined;

  const [open, setOpen] = React.useState(isInProject ?? false);

  React.useEffect(() => {
    setOpen(isInProject ?? false);
  }, [isInProject]);

  if (!isInProject || !projectId) {
    return null;
  }

  const projectBasePath = `/projects/${projectId}`;

  const projectItems = [
    {
      title: "Dashboard",
      url: projectBasePath,
      icon: LayoutDashboard,
    },
    {
      title: "Details",
      url: `${projectBasePath}/details`,
      icon: FileText,
    },
  ];

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip="Project">
              <FolderKanban className="size-4" />
              <span>Project</span>
              <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {projectItems.map((item) => {
                // Determine if this item is active
                let isActive = false;
                if (item.url === projectBasePath) {
                  // Dashboard: only active when exactly on /projects/[id]
                  isActive = pathname === item.url;
                } else {
                  // Details or other pages: active when pathname matches or starts with the URL
                  isActive =
                    pathname === item.url ||
                    pathname?.startsWith(`${item.url}/`);
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
