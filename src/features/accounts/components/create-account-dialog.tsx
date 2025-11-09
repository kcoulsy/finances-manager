"use client";

import { useState } from "react";
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
import { createAccountAction } from "../actions/create-account.action";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import type { AccountType } from "../schemas/account.schema";

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountNumber?: string;
  onAccountCreated: (accountId: string) => void;
}

export function CreateAccountDialog({
  open,
  onOpenChange,
  accountNumber,
  onAccountCreated,
}: CreateAccountDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [bankName, setBankName] = useState("");

  const { execute, status } = useActionWithToast(createAccountAction, {
    onSuccess: ({ data }) => {
      if (data?.success && data?.account) {
        onAccountCreated(data.account.id);
        setName("");
        setBankName("");
        setType("CHECKING");
        onOpenChange(false);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    await execute({
      name: name.trim(),
      type,
      bankName: bankName.trim() || undefined,
      accountNumber: accountNumber || undefined,
      balance: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
          <DialogDescription>
            Create a new account to import transactions into. The account number from your CSV will
            be saved.
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
            {accountNumber && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Number</label>
                <p className="text-sm text-muted-foreground">{accountNumber}</p>
              </div>
            )}
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
              {status === "executing" ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

