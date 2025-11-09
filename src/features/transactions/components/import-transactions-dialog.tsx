"use client";

import { Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CreateAccountDialog } from "@/features/accounts/components/create-account-dialog";
import { Button } from "@/features/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/features/shared/components/ui/dialog";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { importTransactionsAction } from "../actions/import-transactions.action";

const parseCSV = (
  text: string,
): {
  transactions: Array<{
    date: Date;
    amount: number;
    description: string;
    externalId?: string;
  }>;
  accountNumber: string | null;
} => {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  // Parse header row
  const headerLine = lines[0].trim();
  const headers = headerLine.split(",").map((h) => h.trim());

  // Find column indices for: Number, Date, Account, Amount, Subcategory, Memo
  const numberIndex = headers.findIndex((h) => h.toLowerCase() === "number");
  const dateIndex = headers.findIndex((h) => h.toLowerCase() === "date");
  const accountIndex = headers.findIndex((h) => h.toLowerCase() === "account");
  const amountIndex = headers.findIndex((h) => h.toLowerCase() === "amount");
  const subcategoryIndex = headers.findIndex(
    (h) => h.toLowerCase() === "subcategory",
  );
  const memoIndex = headers.findIndex((h) => h.toLowerCase() === "memo");

  if (dateIndex === -1 || amountIndex === -1 || memoIndex === -1) {
    throw new Error(
      "CSV must contain Date, Amount, and Memo columns. Found columns: " +
        headers.join(", "),
    );
  }

  const transactions = [];
  let detectedAccountNumber: string | null = null;

  // Simple CSV parser that handles quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());
    return result;
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line);

    if (values.length < Math.max(dateIndex, amountIndex, memoIndex) + 1) {
      continue; // Skip invalid rows
    }

    const dateStr = values[dateIndex]?.trim();
    const amountStr = values[amountIndex]?.trim();
    const memo = values[memoIndex]?.trim();
    const accountNumberStr =
      accountIndex !== -1 ? values[accountIndex]?.trim() : undefined;
    const number = numberIndex !== -1 ? values[numberIndex]?.trim() : undefined;
    const subcategory =
      subcategoryIndex !== -1 ? values[subcategoryIndex]?.trim() : undefined;

    // Capture account number from first row
    if (accountNumberStr && !detectedAccountNumber) {
      detectedAccountNumber = accountNumberStr;
    }

    if (!dateStr || !amountStr || !memo) {
      continue; // Skip rows with missing required fields
    }

    // Parse date - format is DD/MM/YYYY
    let date: Date;
    try {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        date = new Date(year, month, day);
        if (Number.isNaN(date.getTime())) {
          continue; // Skip if invalid date
        }
      } else {
        // Try standard Date parsing as fallback
        date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) {
          continue; // Skip if can't parse date
        }
      }
    } catch {
      continue; // Skip if can't parse date
    }

    // Parse amount (preserve sign - negative for debits, positive for credits)
    const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ""));

    if (Number.isNaN(amount)) {
      continue; // Skip if can't parse amount
    }

    // Build description from memo and subcategory
    let description = memo;
    if (subcategory && subcategory !== memo) {
      description = `${subcategory} - ${memo}`;
    }

    // Use Number as externalId if available and not "0"
    const externalId = number && number !== "0" ? number : undefined;

    transactions.push({
      date,
      amount, // Preserve sign - import action will determine type from sign
      description,
      externalId,
    });
  }

  return {
    transactions,
    accountNumber: detectedAccountNumber,
  };
};

interface ImportTransactionsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialFile?: File | null;
}

export function ImportTransactionsDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  initialFile,
}: ImportTransactionsDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [csvAccountNumber, setCsvAccountNumber] = useState<string | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<
    Array<{
      date: Date;
      amount: number;
      description: string;
      externalId?: string;
    }>
  >([]);

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const { execute: executeImport, status } = useActionWithToast(
    importTransactionsAction,
    {
      onSuccess: () => {
        setFile(null);
        setOpen(false);
        // Refresh the page to show new transactions
        window.location.reload();
      },
    },
  );

  const handleFileProcess = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);

      try {
        const text = await selectedFile.text();
        const { transactions, accountNumber } = parseCSV(text);

        if (transactions.length === 0) {
          alert("No valid transactions found in the CSV file.");
          return;
        }

        // If account number was detected, check if account exists
        if (accountNumber) {
          setCsvAccountNumber(accountNumber);

          // Check if account with this number exists
          const { getAccountsAction } = await import(
            "@/features/accounts/actions/get-accounts.action"
          );
          const accountsResult = await getAccountsAction({});
          if (accountsResult?.data?.success) {
            const existingAccount = accountsResult.data.accounts.find(
              (acc: { id: string; accountNumber: string | null }) =>
                acc.accountNumber === accountNumber,
            );

            if (existingAccount) {
              // Account exists, use it
              setParsedTransactions(transactions);
              // Proceed with import
              await executeImport({
                accountId: existingAccount.id,
                transactions,
              });
              return;
            } else {
              // Account doesn't exist, show create dialog
              setParsedTransactions(transactions);
              setShowCreateAccount(true);
              return;
            }
          }
        }

        // If no account number detected, show error
        alert(
          "Could not detect account number from CSV. Please ensure the CSV contains an Account column.",
        );
      } catch (error) {
        console.error("Import error:", error);
        alert("Failed to import transactions. Please check the CSV format.");
      }
    },
    [executeImport],
  );

  // Handle initial file when dialog opens
  useEffect(() => {
    if (open && initialFile) {
      const processFile = async () => {
        setFile(initialFile);
        await handleFileProcess(initialFile);
      };
      processFile();
    }
  }, [open, initialFile, handleFileProcess]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileProcess(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      return;
    }

    await handleFileProcess(file);
  };

  const handleAccountCreated = async (accountId: string) => {
    // Proceed with import using the newly created account
    if (parsedTransactions.length > 0) {
      await executeImport({
        accountId,
        transactions: parsedTransactions,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Transactions
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your transaction data. The account will be
            automatically detected from the CSV file. Expected columns: Number,
            Date, Account, Amount, Subcategory, Memo
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="file" className="text-sm font-medium">
              CSV File
            </label>
            <input
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || status === "executing"}
          >
            {status === "executing" ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <CreateAccountDialog
        open={showCreateAccount}
        onOpenChange={setShowCreateAccount}
        accountNumber={csvAccountNumber || undefined}
        defaultCurrency="USD"
        onAccountCreated={handleAccountCreated}
      />
    </Dialog>
  );
}
