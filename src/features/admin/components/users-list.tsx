"use client";

import Link from "next/link";
import { useUsers } from "../hooks/use-users";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import {
  CompactTable,
  CompactTableHeader,
  CompactTableBody,
  CompactTableRow,
  CompactTableHead,
  CompactTableCell,
} from "@/features/shared/components/ui/compact-table";

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
      <CardHeader className="border-b">
        <CardTitle>All Users</CardTitle>
        <CardDescription>Manage users and their roles</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {!users || users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No users found</p>
        ) : (
          <CompactTable>
            <CompactTableHeader className="border-b border-border">
              <CompactTableRow>
                <CompactTableHead>Name</CompactTableHead>
                <CompactTableHead>Email</CompactTableHead>
                <CompactTableHead>Roles</CompactTableHead>
                <CompactTableHead>Verified</CompactTableHead>
                <CompactTableHead>Actions</CompactTableHead>
              </CompactTableRow>
            </CompactTableHeader>
            <CompactTableBody>
              {users.map((user) => (
                <CompactTableRow key={user.id}>
                  <CompactTableCell className="font-medium">{user.name}</CompactTableCell>
                  <CompactTableCell>{user.email}</CompactTableCell>
                  <CompactTableCell>
                    <div className="flex gap-2 flex-wrap">
                      {user.roles.length === 0 ? (
                        <span className="text-muted-foreground text-xs">No roles</span>
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
                  </CompactTableCell>
                  <CompactTableCell>
                    <span className={`text-xs ${user.emailVerified ? "text-green-600" : "text-muted-foreground"}`}>
                      {user.emailVerified ? "Yes" : "No"}
                    </span>
                  </CompactTableCell>
                  <CompactTableCell>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/users/${user.id}`}>View / Edit</Link>
                    </Button>
                  </CompactTableCell>
                </CompactTableRow>
              ))}
            </CompactTableBody>
          </CompactTable>
        )}
      </CardContent>
    </Card>
  );
}
