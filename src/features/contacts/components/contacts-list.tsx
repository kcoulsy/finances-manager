"use client";

import type { Contact } from "@prisma/client";
import {
  Archive,
  Download,
  Mail,
  MoreVertical,
  Phone,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/features/shared/components/ui/dropdown-menu";
import type { SelectOption } from "@/features/shared/components/ui/select";
import { useDebounce } from "@/features/shared/hooks/use-debounce";
import { cn } from "@/features/shared/lib/utils/index";
import {
  CONTACT_ENGAGEMENT_CONFIG,
  CONTACT_STATUS_CONFIG,
} from "../constants/contact-constants";
import { useArchiveContact } from "../hooks/use-archive-contact";
import { useBulkArchiveContacts } from "../hooks/use-bulk-archive-contacts";
import { useBulkDeleteContacts } from "../hooks/use-bulk-delete-contacts";
import { useContacts } from "../hooks/use-contacts";
import { useDeleteContact } from "../hooks/use-delete-contact";
import { useRestoreContact } from "../hooks/use-restore-contact";
import { ImportContactsModal } from "./import-contacts-modal";

const statusOptions: SelectOption[] = [
  { value: "", label: "All Status" },
  ...Object.entries(CONTACT_STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  })),
];

const engagementOptions: SelectOption[] = [
  { value: "", label: "All Engagement" },
  ...Object.entries(CONTACT_ENGAGEMENT_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
  })),
];

const roleOptions: SelectOption[] = [
  { value: "", label: "All Roles" },
  { value: "Client", label: "Client" },
  { value: "Contractor", label: "Contractor" },
  { value: "Supplier", label: "Supplier" },
  { value: "Team Member", label: "Team Member" },
  { value: "Other", label: "Other" },
];

export function ContactsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState("");
  const [engagementFilter, setEngagementFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set(),
  );
  const limit = 10;

  const archiveContact = useArchiveContact();
  const restoreContact = useRestoreContact();
  const deleteContact = useDeleteContact();
  const bulkArchiveContacts = useBulkArchiveContacts();
  const bulkDeleteContacts = useBulkDeleteContacts();

  const { data, isLoading, error } = useContacts({
    search: debouncedSearch || undefined,
    status:
      statusFilter && statusFilter !== ""
        ? (statusFilter as "PERSONAL" | "ENQUIRY" | "CLIENT" | "SUPPLIER")
        : undefined,
    engagement:
      engagementFilter && engagementFilter !== ""
        ? (engagementFilter as "ACTIVE" | "INACTIVE" | "SUSPENDED")
        : undefined,
    role:
      roleFilter && roleFilter !== ""
        ? (roleFilter as
            | "Client"
            | "Contractor"
            | "Supplier"
            | "Team Member"
            | "Other")
        : undefined,
    limit,
    offset: (page - 1) * limit,
    sortBy: "updatedAt",
    sortOrder: "desc",
    includeArchived,
  });

  const contacts = data?.contacts || [];
  const total = data?.total || 0;

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    if (key === "status") {
      setStatusFilter(value);
    } else if (key === "engagement") {
      setEngagementFilter(value);
    } else if (key === "role") {
      setRoleFilter(value);
    }
    setPage(1);
  }, []);

  const handleArchiveContact = useCallback(
    async (contactId: string) => {
      try {
        await archiveContact.mutateAsync({ contactId });
      } catch {
        // Error is handled by toast
      }
    },
    [archiveContact],
  );

  const handleRestoreContact = useCallback(
    async (contactId: string) => {
      try {
        await restoreContact.mutateAsync({ contactId });
      } catch {
        // Error is handled by toast
      }
    },
    [restoreContact],
  );

  const handleDeleteClick = useCallback((contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!contactToDelete) return;

    try {
      await deleteContact.mutateAsync({ contactId: contactToDelete.id });
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    } catch {
      // Error is handled by toast
    }
  }, [contactToDelete, deleteContact]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    // Clear selection when changing pages
    setSelectedContacts(new Set());
  }, []);

  const handleSelectContact = useCallback((contactId: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map((c) => c.id)));
    }
  }, [contacts, selectedContacts.size]);

  const handleExport = useCallback(() => {
    if (selectedContacts.size === 0) {
      return;
    }

    // Get selected contacts from current page
    const selected = contacts.filter((c) => selectedContacts.has(c.id));

    // Get phone - prefer mobile, fallback to work or home
    const getPhone = (contact: Contact) => {
      return (
        contact.phoneMobile || contact.phoneWork || contact.phoneHome || ""
      );
    };

    // Create CSV content
    const headers = ["Contact", "Name", "Email", "Phone", "Type"];
    const rows = selected.map((contact) => {
      const statusConfig = CONTACT_STATUS_CONFIG[contact.status];
      const name = `${contact.firstName} ${contact.lastName}`.trim();
      return [
        `${statusConfig.emoji} ${name}`,
        name,
        contact.email,
        getPhone(contact),
        statusConfig.label,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `contacts-export-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [contacts, selectedContacts]);

  const handleBulkArchive = useCallback(async () => {
    if (selectedContacts.size === 0) {
      return;
    }

    try {
      await bulkArchiveContacts.mutateAsync({
        contactIds: Array.from(selectedContacts),
      });
      setSelectedContacts(new Set());
    } catch {
      // Error is handled by toast
    }
  }, [selectedContacts, bulkArchiveContacts]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedContacts.size === 0) {
      return;
    }

    if (
      !confirm(
        `Are you sure you want to permanently delete ${selectedContacts.size} ${selectedContacts.size === 1 ? "contact" : "contacts"}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await bulkDeleteContacts.mutateAsync({
        contactIds: Array.from(selectedContacts),
      });
      setSelectedContacts(new Set());
    } catch {
      // Error is handled by toast
    }
  }, [selectedContacts, bulkDeleteContacts]);

  const pagination =
    total > 0
      ? {
          page,
          limit,
          totalCount: total,
          totalPages: Math.ceil(total / limit),
        }
      : undefined;

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Contacts</CardTitle>
            <CardDescription>
              Manage your contacts ({total}{" "}
              {total === 1 ? "contact" : "contacts"})
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {selectedContacts.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                  disabled={
                    bulkArchiveContacts.isPending ||
                    bulkDeleteContacts.isPending
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export ({selectedContacts.size})
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkArchive}
                  disabled={
                    bulkArchiveContacts.isPending ||
                    bulkDeleteContacts.isPending
                  }
                  className="h-9"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive ({selectedContacts.size})
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkDelete}
                  disabled={
                    bulkArchiveContacts.isPending ||
                    bulkDeleteContacts.isPending
                  }
                  className="h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedContacts.size})
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Contacts
            </Button>
            <Button asChild>
              <Link href="/contacts/new">New Contact</Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 w-full min-w-0 overflow-hidden">
        <div className="w-full min-w-0 overflow-hidden">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 px-4 py-3 border-b border-border">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="search"
                placeholder="Search contacts by name or email..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full h-10 px-4 pr-10 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="min-w-[150px]">
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[150px]">
              <select
                value={engagementFilter}
                onChange={(e) =>
                  handleFilterChange("engagement", e.target.value)
                }
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {engagementOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[150px]">
              <select
                value={roleFilter}
                onChange={(e) => handleFilterChange("role", e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeArchived"
                checked={includeArchived}
                onChange={(e) => {
                  setIncludeArchived(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-gray-300 cursor-pointer"
              />
              <label
                htmlFor="includeArchived"
                className="text-sm font-medium cursor-pointer"
              >
                Show Archived
              </label>
            </div>
          </div>

          {/* Table */}
          <div className="relative w-full min-w-0 overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground w-12">
                    <input
                      type="checkbox"
                      checked={
                        contacts.length > 0 &&
                        selectedContacts.size === contacts.length
                      }
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                      aria-label="Select all contacts"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                    Contact
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                    Email
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                    Phone
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <p className="text-muted-foreground">
                        Loading contacts...
                      </p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <p className="text-destructive">
                        {error instanceof Error
                          ? error.message
                          : "Failed to load contacts"}
                      </p>
                    </td>
                  </tr>
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <p className="text-muted-foreground">
                        {search ||
                        statusFilter ||
                        engagementFilter ||
                        roleFilter
                          ? "No contacts found matching your filters"
                          : "No contacts found"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => {
                    const statusConfig = CONTACT_STATUS_CONFIG[contact.status];
                    const name =
                      `${contact.firstName} ${contact.lastName}`.trim();
                    const phone =
                      contact.phoneMobile ||
                      contact.phoneWork ||
                      contact.phoneHome ||
                      "";
                    const isSelected = selectedContacts.has(contact.id);
                    const isArchived = contact.deletedAt !== null;

                    return (
                      <tr
                        key={contact.id}
                        className={cn(
                          "border-b border-border transition-colors odd:bg-background even:bg-muted/30 hover:bg-muted/70",
                          isSelected && "bg-muted",
                          isArchived && "opacity-60",
                        )}
                      >
                        <td className="px-3 py-2 align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectContact(contact.id)}
                            className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                            aria-label={`Select ${name}`}
                          />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <Link
                            href={`/contacts/${contact.id}`}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <span
                              className="text-lg"
                              role="img"
                              aria-label={statusConfig.label}
                            >
                              {statusConfig.emoji}
                            </span>
                            <span className="font-medium">{name}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          {contact.email ? (
                            <a
                              href={`mailto:${contact.email}`}
                              className="text-blue-600 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          {phone ? (
                            <a
                              href={`tel:${phone}`}
                              className="text-blue-600 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3 w-3" />
                              {phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              statusConfig.color === "gray" && "text-gray-600",
                              statusConfig.color === "blue" && "text-blue-600",
                              statusConfig.color === "green" &&
                                "text-green-600",
                              statusConfig.color === "purple" &&
                                "text-purple-600",
                            )}
                          >
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isArchived ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRestoreContact(contact.id)
                                  }
                                  disabled={restoreContact.isPending}
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Restore
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleArchiveContact(contact.id)
                                  }
                                  disabled={archiveContact.isPending}
                                >
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(contact)}
                                disabled={deleteContact.isPending}
                                variant="destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Permanently
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((page - 1) * limit + 1, total)} to{" "}
                {Math.min(page * limit, total)} of {total} contacts
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1,
                  )
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === pagination.totalPages ||
                        (p >= page - 1 && p <= page + 1),
                    )
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && p - prev > 1;
                      return (
                        <div key={p} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-muted-foreground">
                              ...
                            </span>
                          )}
                          <Button
                            variant={p === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(p)}
                          >
                            {p}
                          </Button>
                        </div>
                      );
                    })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <ImportContactsModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete Contact Permanently
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>
                {contactToDelete?.firstName} {contactToDelete?.lastName}
              </strong>
              ? This action cannot be undone. The contact will be permanently
              removed from your system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setContactToDelete(null);
              }}
              disabled={deleteContact.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteContact.isPending}
            >
              {deleteContact.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
