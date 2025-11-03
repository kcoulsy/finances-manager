"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAcceptInvitation } from "@/features/projects/hooks/use-accept-invitation";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [hasAttempted, setHasAttempted] = useState(false);

  const acceptInvitation = useAcceptInvitation();

  useEffect(() => {
    if (token && !hasAttempted) {
      setHasAttempted(true);
      acceptInvitation.mutate(
        { token },
        {
          onSuccess: (result) => {
            if (result?.data?.project?.id) {
              router.push(`/projects/${result.data.project.id}`);
            } else {
              router.push("/invitations/pending");
            }
          },
          onError: () => {
            // Error handled by toast
            setTimeout(() => {
              router.push("/invitations/pending");
            }, 2000);
          },
        },
      );
    }
  }, [token, hasAttempted, acceptInvitation, router]);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or missing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/invitations/pending")}>
              View Pending Invitations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accepting Invitation</CardTitle>
          <CardDescription>
            Please wait while we process your invitation...
          </CardDescription>
        </CardHeader>
        <CardContent>
          {acceptInvitation.isPending ? (
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            </div>
          ) : acceptInvitation.isError ? (
            <div className="space-y-4">
              <p className="text-sm text-destructive">
                Failed to accept invitation. You will be redirected shortly.
              </p>
              <Button onClick={() => router.push("/invitations/pending")}>
                View Pending Invitations
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Invitation accepted! Redirecting...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
