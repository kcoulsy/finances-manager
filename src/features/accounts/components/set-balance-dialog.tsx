"use client";

import { useState, useEffect } from "react";
import { Button } from "@/features/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/components/ui/dialog";
import { Input } from "@/features/shared/components/ui/input";
import { setBalanceAsOfDateAction } from "../actions/set-balance-as-of-date.action";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import type { FinancialAccount } from "@prisma/client";

interface SetBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: FinancialAccount | null;
  onSuccess?: () => void;
}

export function SetBalanceDialog({
  open,
  onOpenChange,
  account,
  onSuccess,
}: SetBalanceDialogProps) {
  const [balance, setBalance] = useState<string>("");
  const [balanceAsOfDate, setBalanceAsOfDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  const { execute, status } = useActionWithToast(setBalanceAsOfDateAction, {
    onSuccess: () => {
      setBalance("");
      setBalanceAsOfDate(new Date().toISOString().split("T")[0]);
      onSuccess?.();
    },
  });

  // Reset form when account changes
  useEffect(() => {
    if (account && open) {
      setBalance(account.balance.toString());
      setBalanceAsOfDate(
        account.balanceAsOfDate
          ? new Date(account.balanceAsOfDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      );
    }
  }, [account, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !balance.trim()) {
      return;
    }

    const balanceValue = parseFloat(balance);
    if (Number.isNaN(balanceValue)) {
      return;
    }

    await execute({
      accountId: account.id,
      balance: balanceValue,
      balanceAsOfDate: new Date(balanceAsOfDate),
    });
  };

  if (!account) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Balance as of Date</DialogTitle>
          <DialogDescription>
            Set the current balance for "{account.name}" as of a specific date. This will be used
            to calculate balance changes over time from transactions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="balance" className="text-sm font-medium">
                Balance <span className="text-destructive">*</span>
              </label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                required
                disabled={status === "executing"}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="balanceAsOfDate" className="text-sm font-medium">
                As of Date <span className="text-destructive">*</span>
              </label>
              <Input
                id="balanceAsOfDate"
                type="date"
                value={balanceAsOfDate}
                onChange={(e) => setBalanceAsOfDate(e.target.value)}
                required
                disabled={status === "executing"}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={status === "executing"}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={status === "executing" || !balance.trim()}>
              {status === "executing" ? "Saving..." : "Save Balance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

