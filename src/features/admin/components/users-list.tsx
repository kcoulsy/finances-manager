"use client";

import Link from "next/link";
import { useUsers } from "../hooks/use-users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";

export function UsersList() {
  const { data: users, isLoading, error } = useUsers();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading users...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-destructive">
            {error instanceof Error ? error.message : "Failed to load users"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Users</CardTitle>
        <CardDescription>Manage users and their roles</CardDescription>
      </CardHeader>
      <CardContent>
        {!users || users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Roles</th>
                  <th className="text-left p-4 font-medium">Verified</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">{user.name}</td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">
                      <div className="flex gap-2 flex-wrap">
                        {user.roles.length === 0 ? (
                          <span className="text-muted-foreground text-sm">No roles</span>
                        ) : (
                          user.roles.map((role) => (
                            <span
                              key={role}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary"
                            >
                              {role}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-sm ${user.emailVerified ? "text-green-600" : "text-muted-foreground"}`}>
                        {user.emailVerified ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="p-4">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/users/${user.id}`}>View / Edit</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
