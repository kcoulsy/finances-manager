"use client";

import { Download } from "lucide-react";
import { Button } from "@/features/shared/components/ui/button";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { exportTransactionsAction } from "../actions/export-transactions.action";

export function ExportTransactionsButton() {
  const { execute, status } = useActionWithToast(exportTransactionsAction, {
    onSuccess: ({ data }) => {
      if (
        data &&
        typeof data === "object" &&
        "csvContent" in data &&
        "filename" in data &&
        typeof (data as { csvContent: unknown }).csvContent === "string" &&
        typeof (data as { filename: unknown }).filename === "string"
      ) {
        const csvContent = (data as { csvContent: string }).csvContent;
        const filename = (data as { filename: string }).filename;
        // Create a blob and download the file
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    },
  });

  const handleExport = () => {
    execute({});
  };

  return (
    <Button
      onClick={handleExport}
      disabled={status === "executing"}
      variant="outline"
    >
      <Download className="mr-2 h-4 w-4" />
      {status === "executing" ? "Exporting..." : "Export Transactions"}
    </Button>
  );
}
