import Link from "next/link";
import { ContentLayout } from "@/features/shared/components/layout/content-layout";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <ContentLayout className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {session.user.name}!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{session.user.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{session.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email Verified</p>
              <p className="font-medium">
                {session.user.emailVerified ? "Yes" : "No"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full">
              <Link href="/settings">Manage Account</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/settings">Change Password</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
