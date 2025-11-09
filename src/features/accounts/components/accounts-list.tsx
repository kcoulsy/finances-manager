"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { SetBalanceDialog } from "./set-balance-dialog";
import { EditAccountDialog } from "./edit-account-dialog";
import { CreateAccountDialog } from "./create-account-dialog";
import { AccountBalanceChart } from "./account-balance-chart";
import { formatCurrency } from "@/features/shared/lib/utils/format-currency";
import { Wallet, Plus, Pencil } from "lucide-react";
import type { FinancialAccount } from "@prisma/client";
import { useAccounts } from "../hooks/use-accounts";

interface AccountsListProps {
  defaultCurrency?: string;
}

export function AccountsList({ defaultCurrency = "USD" }: AccountsListProps) {
  const queryClient = useQueryClient();
  const { data: accounts = [], isLoading, error } = useAccounts();
  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<FinancialAccount | null>(null);


  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CHECKING: "Checking",
      SAVINGS: "Savings",
      CREDIT: "Credit",
      INVESTMENT: "Investment",
      OTHER: "Other",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No accounts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first account to start tracking your finances
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Account
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Accounts</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Account
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card key={account.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{account.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {getAccountTypeLabel(account.type)}
                    {account.bankName && ` • ${account.bankName}`}
                  </CardDescription>
                </div>
                {!account.isActive && (
                  <span className="text-xs text-muted-foreground">Inactive</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    account.balance,
                    account.currency || defaultCurrency,
                  )}
                </p>
                {account.balanceAsOfDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    As of {new Date(account.balanceAsOfDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedAccount(account);
                    setShowBalanceDialog(true);
                  }}
                >
                  Set Balance
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setAccountToEdit(account);
                    setShowEditDialog(true);
                  }}
                >
                  <Pencil className="mr-2 h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedAccount(account);
                  }}
                >
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedAccount && (
        <Card>
          <CardHeader>
            <CardTitle>Balance History - {selectedAccount.name}</CardTitle>
            <CardDescription>
              Balance changes over time from transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountBalanceChart
              accountId={selectedAccount.id}
              defaultCurrency={defaultCurrency}
            />
          </CardContent>
        </Card>
      )}

      <SetBalanceDialog
        open={showBalanceDialog}
        onOpenChange={setShowBalanceDialog}
        account={selectedAccount}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          setShowBalanceDialog(false);
        }}
      />

      <EditAccountDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        account={accountToEdit}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          setShowEditDialog(false);
          setAccountToEdit(null);
        }}
      />

      <CreateAccountDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultCurrency={defaultCurrency}
        onAccountCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}

