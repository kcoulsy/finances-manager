"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useUsers } from "../hooks/use-users";
import { useDebounce } from "@/features/shared/hooks/use-debounce";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
  type SortDirection,
  type DataTableFilter,
} from "@/features/shared/components/data-table";
import { UserRole } from "@/features/auth/constants/roles";

type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean | null;
  roles: string[];
};

export function UsersList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [roleFilter, setRoleFilter] = useState("");
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState("");
  const [sortBy, setSortBy] = useState<string | undefined>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortDirection>("desc");
  const limit = 10;

  const { data, isLoading, error } = useUsers({
    page,
    limit,
    search: debouncedSearch || undefined,
    role: roleFilter || undefined,
    emailVerified: emailVerifiedFilter || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder === null ? undefined : sortOrder,
  });

  const users = data?.users ?? [];
  const pagination = data?.pagination;

  const handleSortChange = useCallback(
    (column: string, direction: SortDirection) => {
      setSortBy(column);
      setSortOrder(direction);
      setPage(1); // Reset to first page on sort change
    },
    [],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on search change
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    if (key === "role") {
      setRoleFilter(value);
    } else if (key === "emailVerified") {
      setEmailVerifiedFilter(value);
    }
    setPage(1); // Reset to first page on filter change
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const columns: DataTableColumn<User>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (user) => <span className="font-medium">{user.name}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
    },
    {
      key: "roles",
      header: "Roles",
      render: (user) => (
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
      ),
    },
    {
      key: "emailVerified",
      header: "Verified",
      render: (user) => (
        <span
          className={`text-xs ${user.emailVerified ? "text-green-600" : "text-muted-foreground"}`}
        >
          {user.emailVerified ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (user) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/users/${user.id}`}>View / Edit</Link>
        </Button>
      ),
    },
  ];

  const filters: DataTableFilter[] = [
    {
      key: "role",
      label: "Role",
      type: "select",
      options: [
        { value: UserRole.ADMIN, label: "Admin" },
        { value: UserRole.MODERATOR, label: "Moderator" },
        { value: UserRole.USER, label: "User" },
      ],
    },
    {
      key: "emailVerified",
      label: "Email Verified",
      type: "select",
      options: [
        { value: "true", label: "Verified" },
        { value: "false", label: "Not Verified" },
      ],
    },
  ];

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="border-b">
        <CardTitle>All Users</CardTitle>
        <CardDescription>Manage users and their roles</CardDescription>
      </CardHeader>
      <CardContent className="p-0 w-full min-w-0 overflow-hidden">
        <DataTable
          data={users}
          columns={columns}
          isLoading={isLoading}
          error={error}
          searchValue={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by name or email..."
          filters={filters}
          filterValues={{
            role: roleFilter,
            emailVerified: emailVerifiedFilter,
          }}
          onFilterChange={handleFilterChange}
          sortColumn={sortBy}
          sortDirection={sortOrder}
          onSortChange={handleSortChange}
          pagination={pagination}
          onPageChange={handlePageChange}
          emptyMessage="No users found"
        />
      </CardContent>
    </Card>
  );
}
