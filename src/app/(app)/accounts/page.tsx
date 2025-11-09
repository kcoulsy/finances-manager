import { ContentLayout } from "@/features/shared/components/layout/content-layout";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";
import { AccountsList } from "@/features/accounts/components/accounts-list";
import { Button } from "@/features/shared/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function AccountsPage() {
  const session = await requireAuth();

  return (
    <ContentLayout className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Manage your bank accounts and track balances
          </p>
        </div>
        <Button asChild>
          <Link href="/accounts/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Account
          </Link>
        </Button>
      </div>

      <AccountsList />
    </ContentLayout>
  );
}

