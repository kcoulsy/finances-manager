"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { ExportAccountsButton } from "./export-accounts-button";
import { ImportAccountsDialog } from "./import-accounts-dialog";

export function AccountsExportImport() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts Export & Import</CardTitle>
        <CardDescription>
          Export your accounts to a CSV file or import accounts from a CSV file.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <ExportAccountsButton />
          <ImportAccountsDialog />
        </div>
      </CardContent>
    </Card>
  );
}

