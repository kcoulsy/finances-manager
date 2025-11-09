"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { ExportTransactionsButton } from "./export-transactions-button";
import { ImportTransactionsDialog } from "./import-transactions-dialog";

export function TransactionsExportImport() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions Export & Import</CardTitle>
        <CardDescription>
          Export your transactions to a CSV file or import transactions from a CSV file.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <ExportTransactionsButton />
          <ImportTransactionsDialog />
        </div>
      </CardContent>
    </Card>
  );
}

