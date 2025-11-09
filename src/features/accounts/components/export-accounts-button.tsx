"use client";

import { Download } from "lucide-react";
import { Button } from "@/features/shared/components/ui/button";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { exportAccountsAction } from "../actions/export-accounts.action";

export function ExportAccountsButton() {
  const { execute, status } = useActionWithToast(exportAccountsAction, {
    onSuccess: ({ data }) => {
      if (data?.csvContent && data?.filename) {
        // Create a blob and download the file
        const blob = new Blob([data.csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename;
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
      {status === "executing" ? "Exporting..." : "Export Accounts"}
    </Button>
  );
}

