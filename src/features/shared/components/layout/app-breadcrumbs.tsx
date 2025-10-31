"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBreadcrumbs } from "./breadcrumb-context";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/features/shared/components/ui/breadcrumb";

/**
 * Route metadata for generating breadcrumb labels
 */
const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  settings: "Settings",
  admin: "Admin",
  users: "Users",
  new: "New",
};

/**
 * Get a friendly label for a route segment
 */
function getRouteLabel(segment: string): string {
  // Handle dynamic segments (UUIDs, IDs, etc.)
  if (segment.match(/^[a-f0-9-]{36}$/i) || segment.match(/^\d+$/)) {
    return segment.slice(0, 8) + "...";
  }

  // Return label from routeLabels or capitalize the segment
  return routeLabels[segment.toLowerCase()] || segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function AppBreadcrumbs() {
  const { breadcrumbs } = useBreadcrumbs();
  const pathname = usePathname();

  // If breadcrumbs are explicitly set, use them
  if (breadcrumbs.length > 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <div key={item.href || item.label} className="flex items-center">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={item.href || "#"}>{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Otherwise, auto-generate from pathname
  return <AutoBreadcrumbs pathname={pathname} />;
}

function AutoBreadcrumbs({ pathname }: { pathname: string }) {
  // Split pathname into segments and filter out empty strings
  const pathSegments = pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs if we're on the dashboard root
  if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === "dashboard")) {
    return null;
  }

  // Build segments array, starting with dashboard if not already first
  const segments: string[] = [];

  // If first segment is not dashboard, we're in a different route group
  // Otherwise, include all segments after dashboard
  if (pathSegments[0] !== "dashboard") {
    segments.push(...pathSegments);
  } else if (pathSegments.length > 1) {
    segments.push(...pathSegments.slice(1));
  }

  // Don't show breadcrumbs if there are no segments
  if (segments.length === 0) {
    return null;
  }

  // Build href paths correctly
  const buildHref = (segments: string[], index: number): string => {
    const path = segments.slice(0, index + 1);
    // If first segment is not dashboard, build path from root
    if (pathSegments[0] !== "dashboard") {
      return "/" + path.join("/");
    }
    // Otherwise build path with dashboard prefix
    return "/dashboard/" + path.join("/");
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const href = buildHref(segments, index);
          const label = getRouteLabel(segment);

          return (
            <div key={`${segment}-${href}`} className="flex items-center">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

