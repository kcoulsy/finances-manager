"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/features/shared/lib/utils/index";
import { DetectTransfersButton } from "@/features/transactions/components/detect-transfers-button";
import { ImportTransactionsDialog } from "@/features/transactions/components/import-transactions-dialog";
import { TransactionsList } from "@/features/transactions/components/transactions-list";

interface DashboardClientProps {
  defaultCurrency?: string;
  userName: string;
}

export function DashboardClient({
  defaultCurrency = "USD",
  userName,
}: DashboardClientProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverCount, setDragOverCount] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only handle if dragging files
    if (e.dataTransfer.types.includes("Files")) {
      setDragOverCount((prev) => prev + 1);
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDragOverCount((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  // Suppress unused variable warning - dragOverCount is used to track nested drag events
  void dragOverCount;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);
    setDragOverCount(0);

    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(
      (file) =>
        file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv"),
    );

    if (csvFile) {
      setDroppedFile(csvFile);
      setImportDialogOpen(true);
    }
  }, []);

  // Reset dropped file when dialog closes
  useEffect(() => {
    if (!importDialogOpen) {
      setDroppedFile(null);
    }
  }, [importDialogOpen]);

  return (
    <div
      className={cn(
        "min-h-screen transition-colors",
        isDragging && "bg-primary/5",
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="application"
      aria-label="Dashboard with drag and drop support"
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm">
          <div className="rounded-lg border-2 border-dashed border-primary bg-card p-8 shadow-lg">
            <p className="text-lg font-semibold text-primary">
              Drop CSV file here to import transactions
            </p>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back, {userName}!
            </p>
          </div>
          <div className="flex gap-2">
            <ImportTransactionsDialog
              open={importDialogOpen}
              onOpenChange={setImportDialogOpen}
              initialFile={droppedFile}
            />
            <DetectTransfersButton />
          </div>
        </div>

        <TransactionsList defaultCurrency={defaultCurrency} />
      </div>
    </div>
  );
}
