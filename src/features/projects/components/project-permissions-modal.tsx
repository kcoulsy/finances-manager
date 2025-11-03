"use client";

import { Info } from "lucide-react";
import { Button } from "@/features/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/components/ui/dialog";
import {
  PROJECT_PERMISSION_CATEGORIES,
  PROJECT_PERMISSION_DESCRIPTIONS,
  PROJECT_ROLE_PERMISSIONS,
} from "../constants/project-permissions";

interface ProjectPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: "OWNER" | "MEMBER" | "INVITED";
}

export function ProjectPermissionsModal({
  open,
  onOpenChange,
  role,
}: ProjectPermissionsModalProps) {
  const userPermissions = new Set(PROJECT_ROLE_PERMISSIONS[role] || []);

  const roleLabels: Record<"OWNER" | "MEMBER" | "INVITED", string> = {
    OWNER: "Project Owner",
    MEMBER: "Project Member",
    INVITED: "Invited User",
  };

  // Filter categories to only show those with at least one permission the user has
  const visibleCategories = PROJECT_PERMISSION_CATEGORIES.filter((category) =>
    category.permissions.some((perm) => userPermissions.has(perm)),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            {roleLabels[role]} Permissions
          </DialogTitle>
          <DialogDescription>
            These are the permissions granted to users with the{" "}
            <strong>{roleLabels[role]}</strong> role on this project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {visibleCategories.map((category) => {
              // Get permissions in this category that the user actually has
              const categoryPermissions = category.permissions.filter((perm) =>
                userPermissions.has(perm),
              );

              if (categoryPermissions.length === 0) {
                return null;
              }

              return (
                <div key={category.name} className="space-y-2">
                  <div className="font-semibold">{category.name}</div>
                  <ul className="list-none space-y-1 pl-4">
                    {categoryPermissions.map((permission) => {
                      const description =
                        PROJECT_PERMISSION_DESCRIPTIONS[permission];
                      return (
                        <li key={permission} className="text-sm">
                          <span className="text-muted-foreground">•</span>{" "}
                          {description}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
