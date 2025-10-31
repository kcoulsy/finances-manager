"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../hooks/use-user";
import { useRoles } from "../hooks/use-roles";
import { useUpdateUserRoles } from "../hooks/use-update-user-roles";
import { useVerifyUser } from "../hooks/use-verify-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { UserProjectsTable } from "./user-projects-table";

interface UserDetailProps {
  userId: string;
}

export function UserDetail({ userId }: UserDetailProps) {
  const router = useRouter();
  const { data: user, isLoading: isLoadingUser, error: userError } = useUser(userId);
  const { data: roles, isLoading: isLoadingRoles } = useRoles();
  const updateUserRoles = useUpdateUserRoles();
  const verifyUser = useVerifyUser();
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  // Initialize selected roles when user data loads
  useEffect(() => {
    if (user?.roles) {
      setSelectedRoleIds(user.roles.map((r) => r.id));
    }
  }, [user]);

  if (isLoadingUser || isLoadingRoles) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading user...</p>
        </CardContent>
      </Card>
    );
  }

  if (userError || !user) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-destructive">
            {userError instanceof Error ? userError.message : "Failed to load user"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSaveRoles = async () => {
    try {
      await updateUserRoles.mutateAsync({
        userId: user.id,
        roleIds: selectedRoleIds,
      });
    } catch (error) {
      console.error("Error updating roles:", error);
    }
  };

  const handleVerifyUser = async () => {
    try {
      await verifyUser.mutateAsync(user.id);
    } catch (error) {
      console.error("Error verifying user:", error);
    }
  };

  const rolesChanged =
    JSON.stringify(selectedRoleIds.sort()) !==
    JSON.stringify((user.roles || []).map((r) => r.id).sort());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Details</CardTitle>
              <CardDescription>View and manage user information</CardDescription>
            </div>
            <Button variant="outline" onClick={() => router.push("/admin/users")}>
              Back to Users
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Name</p>
              <p className="font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email Verified</p>
              <div className="flex items-center gap-2">
                <p className={`font-medium ${user.emailVerified ? "text-green-600" : "text-muted-foreground"}`}>
                  {user.emailVerified ? "Yes" : "No"}
                </p>
                {!user.emailVerified && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleVerifyUser}
                    disabled={verifyUser.isPending}
                  >
                    {verifyUser.isPending ? "Verifying..." : "Verify Email"}
                  </Button>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">User ID</p>
              <p className="font-mono text-sm">{user.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created At</p>
              <p className="text-sm">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Updated At</p>
              <p className="text-sm">
                {new Date(user.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Roles</CardTitle>
          <CardDescription>Manage user roles and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!roles || roles.length === 0 ? (
            <p className="text-muted-foreground">No roles available</p>
          ) : (
            <>
              <div className="space-y-2">
                {roles.map((role) => {
                  const isSelected = selectedRoleIds.includes(role.id);
                  return (
                    <label
                      key={role.id}
                      className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRoleToggle(role.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{role.name}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {selectedRoleIds.length} role(s) selected
                </p>
                <Button
                  onClick={handleSaveRoles}
                  disabled={!rolesChanged || updateUserRoles.isPending}
                >
                  {updateUserRoles.isPending ? "Saving..." : "Save Roles"}
                </Button>
              </div>
              {updateUserRoles.isError && (
                <p className="text-sm text-destructive">
                  {updateUserRoles.error instanceof Error
                    ? updateUserRoles.error.message
                    : "Failed to update roles"}
                </p>
              )}
              {updateUserRoles.isSuccess && (
                <p className="text-sm text-green-600">Roles updated successfully</p>
              )}
              {verifyUser.isError && (
                <p className="text-sm text-destructive">
                  {verifyUser.error instanceof Error
                    ? verifyUser.error.message
                    : "Failed to verify user"}
                </p>
              )}
              {verifyUser.isSuccess && (
                <p className="text-sm text-green-600">User verified successfully</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <UserProjectsTable userId={userId} />
    </div>
  );
}

