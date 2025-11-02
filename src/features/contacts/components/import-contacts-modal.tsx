"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importContactsAction } from "../actions/import-contacts.action";
import type { ImportContactsInput } from "../schemas/contact.schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/components/ui/dialog";
import { Button } from "@/features/shared/components/ui/button";
import { Upload, FileText, FileSpreadsheet, AlertCircle } from "lucide-react";
import { showToastFromAction } from "@/features/shared/lib/actions/toast";

interface ImportContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportContactsModal({
  open,
  onOpenChange,
}: ImportContactsModalProps) {
  const queryClient = useQueryClient();
  const [fileType, setFileType] = useState<"vcard" | "csv">("vcard");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const importContacts = useMutation({
    mutationFn: async (data: ImportContactsInput) => {
      const result = await importContactsAction(data);
      showToastFromAction(result as Parameters<typeof showToastFromAction>[0]);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      // Reset form after successful import
      setFile(null);
      setFileType("vcard");
    },
  });

  const handleFileSelect = (selectedFile: File) => {
    const extension = selectedFile.name.toLowerCase().split(".").pop();
    
    if (extension === "vcf") {
      setFileType("vcard");
      setFile(selectedFile);
    } else if (extension === "csv") {
      setFileType("csv");
      setFile(selectedFile);
    } else {
      alert("Please select a .vcf or .csv file");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleImport = async () => {
    if (!file) {
      alert("Please select a file to import");
      return;
    }

    setIsProcessing(true);
    try {
      const content = await file.text();
      
      await importContacts.mutateAsync({
        fileContent: content,
        fileType,
      });

      // Close modal after successful import
      onOpenChange(false);
    } catch (error) {
      // Error toast is handled by showToastFromAction
      console.error("Import error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = isProcessing || importContacts.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Import contacts from a vCard (.vcf) or CSV file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File type selector */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={fileType === "vcard" ? "default" : "outline"}
              onClick={() => {
                setFileType("vcard");
                setFile(null);
              }}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              vCard (.vcf)
            </Button>
            <Button
              type="button"
              variant={fileType === "csv" ? "default" : "outline"}
              onClick={() => {
                setFileType("csv");
                setFile(null);
              }}
              className="flex-1"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>

          {fileType === "vcard" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Import contacts from a vCard (.vcf) file. This format is commonly used by email clients and address book applications.
              </p>
              
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25"
                }`}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-2">
                  Drag and drop a .vcf file here, or click to browse
                </p>
                <input
                  type="file"
                  accept=".vcf"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input">
                  <Button type="button" variant="outline" asChild>
                    <span>Select vCard File</span>
                  </Button>
                </label>
                {file && file.name.endsWith(".vcf") && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">CSV Format Requirements</p>
                    <p className="text-muted-foreground">
                      Your CSV file must include a header row with these column names (case-insensitive):
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                      <li><strong>Required:</strong> First Name (or firstName, first_name), Last Name (or lastName, last_name), Email (or email, email address)</li>
                      <li><strong>Optional:</strong> Mobile, Home, Work, Notes, Website, Company, Position</li>
                    </ul>
                    <p className="text-muted-foreground mt-2">
                      Example header row:
                    </p>
                    <code className="block bg-background p-2 rounded text-xs">
                      First Name,Last Name,Email,Mobile,Company,Position
                    </code>
                  </div>
                </div>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25"
                }`}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-2">
                  Drag and drop a .csv file here, or click to browse
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input">
                  <Button type="button" variant="outline" asChild>
                    <span>Select CSV File</span>
                  </Button>
                </label>
                {file && file.name.endsWith(".csv") && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Selected: {file.name}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setFile(null);
              setFileType("vcard");
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isLoading || !file}
          >
            {isLoading ? "Importing..." : "Import Contacts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

