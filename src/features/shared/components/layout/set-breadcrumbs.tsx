"use client";

import { useEffect } from "react";
import { useBreadcrumbs, type BreadcrumbItem } from "./breadcrumb-context";

interface SetBreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  children?: React.ReactNode;
}

/**
 * Component to set breadcrumbs for the current page
 * Use this in page components to specify custom breadcrumbs
 * 
 * @example
 * ```tsx
 * <SetBreadcrumbs breadcrumbs={[
 *   { label: "Projects", href: "/projects" },
 *   { label: project.name }
 * ]}>
 *   <ProjectDetail project={project} />
 * </SetBreadcrumbs>
 * ```
 */
export function SetBreadcrumbs({ breadcrumbs, children }: SetBreadcrumbsProps) {
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs(breadcrumbs);

    // Clear breadcrumbs on unmount
    return () => {
      setBreadcrumbs([]);
    };
  }, [breadcrumbs, setBreadcrumbs]);

  return <>{children}</>;
}

