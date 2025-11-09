"use client";

import { useState, useCallback } from "react";
import { Upload } from "lucide-react";
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
import { importAccountsAction } from "../actions/import-accounts.action";
import { useQueryClient } from "@tanstack/react-query";

export function ImportAccountsDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const { execute, status } = useActionWithToast(importAccountsAction, {
    onSuccess: ({ data }) => {
      setFile(null);
      setOpen(false);
      // Invalidate accounts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      
      // Show detailed success message if there were errors
      if (data?.errors && data.errors.length > 0) {
        console.warn("Import completed with errors:", data.errors);
      }
    },
  });

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
      }
    },
    [],
  );

  const handleImport = useCallback(async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      if (csvContent) {
        execute({ csvContent });
      }
    };
    reader.readAsText(file);
  }, [file, execute]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Accounts
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Accounts</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your account data. Expected columns: Name,
            Type, Bank Name, Account Number, Balance, Balance As Of Date,
            Currency, Is Active
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
    </Dialog>
  );
}

