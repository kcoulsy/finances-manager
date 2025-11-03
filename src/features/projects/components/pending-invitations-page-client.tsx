"use client";

import { useCallback, useState } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/features/shared/components/data-table/data-table";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { useAcceptInvitation } from "../hooks/use-accept-invitation";
import { useListPendingInvitations } from "../hooks/use-list-pending-invitations";

type Invitation = {
  id: string;
  project: {
    id: string;
    name: string;
    description: string | null;
  };
  userType: "Client" | "Contractor" | "Employee" | "Legal";
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  expiresAt: Date;
  token: string;
};

export function PendingInvitationsPageClient() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useListPendingInvitations({
    page,
    limit,
  });

  const acceptInvitation = useAcceptInvitation();

  const handleAcceptInvitation = useCallback(
    async (token: string) => {
      try {
        await acceptInvitation.mutateAsync({ token });
      } catch {
        // Error handled by toast
      }
    },
    [acceptInvitation],
  );

  const invitations = data?.invitations || [];
  const total = data?.total || 0;

  const columns: DataTableColumn<Invitation>[] = [
    {
      key: "project",
      header: "Project",
      render: (invitation) => (
        <div>
          <div className="font-medium">{invitation.project.name}</div>
          {invitation.project.description && (
            <div className="text-sm text-muted-foreground">
              {invitation.project.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "invitedBy",
      header: "Invited By",
      render: (invitation) => (
        <div>
          <div className="font-medium">{invitation.invitedBy.name}</div>
          <div className="text-sm text-muted-foreground">
            {invitation.invitedBy.email}
          </div>
        </div>
      ),
    },
    {
      key: "userType",
      header: "Role",
      render: (invitation) => (
        <span className="text-sm">{invitation.userType}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (invitation) => (
        <Button
          onClick={() => handleAcceptInvitation(invitation.token)}
          disabled={acceptInvitation.isPending}
        >
          {acceptInvitation.isPending ? "Accepting..." : "Accept Invitation"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Pending Invitations</h1>
        <p className="text-muted-foreground mt-2">
          View and accept invitations to join projects
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            You have been invited to join these projects
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 w-full min-w-0 overflow-hidden">
          <DataTable
            data={invitations}
            columns={columns}
            isLoading={isLoading}
            error={error}
            pagination={
              total > 0
                ? {
                    page,
                    limit,
                    totalCount: total,
                    totalPages: Math.ceil(total / limit),
                  }
                : undefined
            }
            onPageChange={setPage}
            emptyMessage="You don't have any pending invitations."
          />
        </CardContent>
      </Card>
    </div>
  );
}
