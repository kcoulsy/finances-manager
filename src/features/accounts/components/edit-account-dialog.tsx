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
import { Select } from "@/features/shared/components/ui/select";
import { updateAccountAction } from "../actions/update-account.action";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { CURRENCIES } from "@/features/shared/lib/constants/currencies";
import type { AccountType } from "../schemas/account.schema";
import type { FinancialAccount } from "@prisma/client";

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: FinancialAccount | null;
  onSuccess?: () => void;
}

export function EditAccountDialog({
  open,
  onOpenChange,
  account,
  onSuccess,
}: EditAccountDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [currency, setCurrency] = useState<string>("USD");
  const [isActive, setIsActive] = useState(true);

  const { execute, status } = useActionWithToast(updateAccountAction, {
    onSuccess: () => {
      onSuccess?.();
      onOpenChange(false);
    },
  });

  // Reset form when account changes
  useEffect(() => {
    if (account && open) {
      setName(account.name);
      setType(account.type as AccountType);
      setBankName(account.bankName || "");
      setAccountNumber(account.accountNumber || "");
      setCurrency(account.currency || "USD");
      setIsActive(account.isActive);
    }
  }, [account, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !name.trim()) {
      return;
    }

    await execute({
      accountId: account.id,
      name: name.trim(),
      type,
      bankName: bankName.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      currency,
      isActive,
    });
  };

  if (!account) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update account details and settings
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Account Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Main Checking Account"
                required
                disabled={status === "executing"}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">
                Account Type <span className="text-destructive">*</span>
              </label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as AccountType)}
                options={[
                  { value: "CHECKING", label: "Checking" },
                  { value: "SAVINGS", label: "Savings" },
                  { value: "CREDIT", label: "Credit" },
                  { value: "INVESTMENT", label: "Investment" },
                  { value: "OTHER", label: "Other" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="bankName" className="text-sm font-medium">
                Bank Name
              </label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g., Chase Bank"
                disabled={status === "executing"}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="accountNumber" className="text-sm font-medium">
                Account Number
              </label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Last 4 digits or masked"
                disabled={status === "executing"}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="currency" className="text-sm font-medium">
                Currency <span className="text-destructive">*</span>
              </label>
              <Select
                value={currency}
                onValueChange={setCurrency}
                options={CURRENCIES}
                placeholder="Select currency"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={status === "executing"}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Active Account
              </label>
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
            <Button type="submit" disabled={status === "executing" || !name.trim()}>
              {status === "executing" ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

