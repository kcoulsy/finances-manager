"use client";

import type { Address, Contact } from "@prisma/client";
import { Archive, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { QuickNoteModal } from "@/features/notes/components/quick-note-modal";
import { useDeleteNote } from "@/features/notes/hooks/use-delete-note";
import { useNotes } from "@/features/notes/hooks/use-notes";
import { useUpdateNote } from "@/features/notes/hooks/use-update-note";
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
import { cn } from "@/features/shared/lib/utils/index";
import {
  CONTACT_ENGAGEMENT_CONFIG,
  CONTACT_STATUS_CONFIG,
} from "../constants/contact-constants";
import { useArchiveContact } from "../hooks/use-archive-contact";
import { useDeleteContact } from "../hooks/use-delete-contact";
import { useRestoreContact } from "../hooks/use-restore-contact";
import { AddressesSection } from "./addresses-section";
import { ContactForm } from "./contact-form";

interface ContactDetailViewProps {
  contact: Contact;
}

export function ContactDetailView({ contact }: ContactDetailViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quickNoteModalOpen, setQuickNoteModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deleteNoteDialogOpen, setDeleteNoteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const archiveContact = useArchiveContact();
  const restoreContact = useRestoreContact();
  const deleteContact = useDeleteContact();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const { data: notesData, isLoading: notesLoading } = useNotes({
    contactId: contact.id,
    status: "ACTIVE",
    sortBy: "updated_at",
    sortDirection: "desc",
    limit: 100,
    offset: 0,
    includeDeleted: false,
  });

  const notes = notesData?.notes || [];

  const isArchived = contact.deletedAt !== null;

  const handleArchiveContact = useCallback(async () => {
    try {
      await archiveContact.mutateAsync({ contactId: contact.id });
    } catch {
      // Error is handled by toast
    }
  }, [contact.id, archiveContact]);

  const handleRestoreContact = useCallback(async () => {
    try {
      await restoreContact.mutateAsync({ contactId: contact.id });
    } catch {
      // Error is handled by toast
    }
  }, [contact.id, restoreContact]);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    try {
      await deleteContact.mutateAsync({ contactId: contact.id });
      setDeleteDialogOpen(false);
      router.push("/contacts");
    } catch {
      // Error is handled by toast
    }
  }, [contact.id, deleteContact, router]);

  const handleStartEditingNote = useCallback(
    (noteId: string, content: string) => {
      setEditingNoteId(noteId);
      setEditingContent(content);
    },
    [],
  );

  const handleCancelEditingNote = useCallback(() => {
    setEditingNoteId(null);
    setEditingContent("");
  }, []);

  const handleSaveNote = useCallback(async () => {
    if (!editingNoteId || !editingContent.trim()) return;

    try {
      await updateNote.mutateAsync({
        noteId: editingNoteId,
        content: editingContent.trim(),
      });
      handleCancelEditingNote();
    } catch {
      // Error is handled by toast
    }
  }, [editingNoteId, editingContent, updateNote, handleCancelEditingNote]);

  const handleDeleteNoteClick = useCallback((noteId: string) => {
    setNoteToDelete(noteId);
    setDeleteNoteDialogOpen(true);
  }, []);

  const handleDeleteNoteConfirm = useCallback(async () => {
    if (!noteToDelete) return;

    try {
      await deleteNote.mutateAsync({ noteId: noteToDelete });
      setDeleteNoteDialogOpen(false);
      setNoteToDelete(null);
    } catch {
      // Error is handled by toast
    }
  }, [noteToDelete, deleteNote]);

  if (isEditing) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => setIsEditing(false)}>
          Cancel Editing
        </Button>
        <ContactForm
          contactId={contact.id}
          initialData={{
            role: contact.role,
            status: contact.status,
            engagement: contact.engagement,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phoneMobile: contact.phoneMobile,
            phoneHome: contact.phoneHome,
            phoneWork: contact.phoneWork,
            notes: contact.notes,
            personalWebsite: contact.personalWebsite,
            linkedinUrl: contact.linkedinUrl,
            twitterHandle: contact.twitterHandle,
            facebookUrl: contact.facebookUrl,
            instagramHandle: contact.instagramHandle,
            companyName: contact.companyName,
            companyWebsite: contact.companyWebsite,
            vatNumber: contact.vatNumber,
            registrationNumber: contact.registrationNumber,
            accountsEmail: contact.accountsEmail,
            position: contact.position,
            addresses:
              "addresses" in contact &&
              contact.addresses &&
              Array.isArray(contact.addresses)
                ? contact.addresses.map((addr: Address) => ({
                    type: addr.type as
                      | "HOME"
                      | "WORK"
                      | "BILLING"
                      | "SHIPPING"
                      | "OTHER",
                    label: addr.label,
                    addressLine1: addr.addressLine1,
                    addressLine2: addr.addressLine2,
                    locality: addr.locality,
                    city: addr.city,
                    county: addr.county,
                    postalCode: addr.postalCode,
                    country: addr.country,
                    isPrimary: addr.isPrimary,
                    isActive: addr.isActive,
                    notes: addr.notes,
                  }))
                : [],
          }}
        />
      </div>
    );
  }

  const statusConfig = CONTACT_STATUS_CONFIG[contact.status];
  const engagementConfig = contact.engagement
    ? CONTACT_ENGAGEMENT_CONFIG[contact.engagement]
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className="text-4xl"
                role="img"
                aria-label={statusConfig.label}
              >
                {statusConfig.emoji}
              </span>
              <div>
                <CardTitle className="text-2xl">
                  {contact.firstName} {contact.lastName}
                </CardTitle>
                <CardDescription>{contact.email}</CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push("/contacts")}>
              Back to Contacts
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">First Name</p>
                <p className="font-medium">{contact.firstName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Name</p>
                <p className="font-medium">{contact.lastName}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {contact.email}
                  </a>
                ) : (
                  <p className="font-medium">-</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Details */}
          {(contact.phoneMobile || contact.phoneHome || contact.phoneWork) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Details</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {contact.phoneMobile && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Mobile Phone
                    </p>
                    <a
                      href={`tel:${contact.phoneMobile}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {contact.phoneMobile}
                    </a>
                  </div>
                )}
                {contact.phoneHome && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Home Phone
                    </p>
                    <a
                      href={`tel:${contact.phoneHome}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {contact.phoneHome}
                    </a>
                  </div>
                )}
                {contact.phoneWork && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Work Phone
                    </p>
                    <a
                      href={`tel:${contact.phoneWork}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {contact.phoneWork}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Role & Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Role & Status</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {contact.role && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Role</p>
                  <p className="font-medium">{contact.role}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <p
                  className={cn(
                    "font-medium",
                    statusConfig.color === "gray" && "text-gray-600",
                    statusConfig.color === "blue" && "text-blue-600",
                    statusConfig.color === "green" && "text-green-600",
                    statusConfig.color === "purple" && "text-purple-600",
                  )}
                >
                  {statusConfig.label}
                </p>
              </div>
              {engagementConfig && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Engagement
                  </p>
                  <p
                    className={cn(
                      "font-medium",
                      engagementConfig.color === "gray" && "text-gray-600",
                      engagementConfig.color === "green" && "text-green-600",
                      engagementConfig.color === "yellow" && "text-yellow-600",
                    )}
                  >
                    {engagementConfig.label}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Position */}
          {contact.position && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Role & Position</h3>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Position</p>
                <p className="font-medium">{contact.position}</p>
              </div>
            </div>
          )}

          {/* Company Information */}
          {(contact.companyName ||
            contact.companyWebsite ||
            contact.vatNumber ||
            contact.registrationNumber ||
            contact.accountsEmail) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Company Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {contact.companyName && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Company Name
                    </p>
                    <p className="font-medium">{contact.companyName}</p>
                  </div>
                )}
                {contact.companyWebsite && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Company Website
                    </p>
                    <Link
                      href={contact.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {contact.companyWebsite}
                    </Link>
                  </div>
                )}
                {contact.vatNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      VAT Number
                    </p>
                    <p className="font-medium">{contact.vatNumber}</p>
                  </div>
                )}
                {contact.registrationNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Registration Number
                    </p>
                    <p className="font-medium">{contact.registrationNumber}</p>
                  </div>
                )}
                {contact.accountsEmail && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Accounts Email
                    </p>
                    <a
                      href={`mailto:${contact.accountsEmail}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {contact.accountsEmail}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Social Media & Web */}
          {(contact.personalWebsite ||
            contact.linkedinUrl ||
            contact.twitterHandle ||
            contact.facebookUrl ||
            contact.instagramHandle) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Social Media & Web</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {contact.personalWebsite && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Personal Website
                    </p>
                    <Link
                      href={contact.personalWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {contact.personalWebsite}
                    </Link>
                  </div>
                )}
                {contact.linkedinUrl && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      LinkedIn
                    </p>
                    <Link
                      href={contact.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {contact.linkedinUrl}
                    </Link>
                  </div>
                )}
                {contact.twitterHandle && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Twitter
                    </p>
                    <p className="font-medium">@{contact.twitterHandle}</p>
                  </div>
                )}
                {contact.facebookUrl && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Facebook
                    </p>
                    <Link
                      href={contact.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {contact.facebookUrl}
                    </Link>
                  </div>
                )}
                {contact.instagramHandle && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Instagram
                    </p>
                    <p className="font-medium">@{contact.instagramHandle}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Notes</h3>
              <div>
                <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
              </div>
            </div>
          )}

          {/* Contact Notes */}
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Contact Notes</h3>
              <Button size="sm" onClick={() => setQuickNoteModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </div>
            {notesLoading ? (
              <p className="text-sm text-muted-foreground">Loading notes...</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notes for this contact yet.
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">
                        Content
                      </th>
                      <th className="text-left p-3 text-sm font-medium">
                        Priority
                      </th>
                      <th className="text-left p-3 text-sm font-medium">
                        Updated
                      </th>
                      <th className="text-right p-3 text-sm font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {notes.map((note) => (
                      <tr key={note.id} className="border-t">
                        <td className="p-3">
                          {editingNoteId === note.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingContent}
                                onChange={(e) =>
                                  setEditingContent(e.target.value)
                                }
                                rows={3}
                                className="w-full p-2 border rounded-md text-sm"
                                placeholder="Note content..."
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleSaveNote}
                                  disabled={
                                    updateNote.isPending ||
                                    !editingContent.trim()
                                  }
                                >
                                  {updateNote.isPending ? "Saving..." : "Save"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEditingNote}
                                  disabled={updateNote.isPending}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm">
                              <p className="whitespace-pre-wrap line-clamp-3">
                                {note.content}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "text-xs px-2 py-1 rounded font-medium",
                              note.priority === "URGENT" &&
                                "bg-red-100 text-red-800",
                              note.priority === "HIGH" &&
                                "bg-orange-100 text-orange-800",
                              note.priority === "NORMAL" &&
                                "bg-blue-100 text-blue-800",
                              note.priority === "LOW" &&
                                "bg-gray-100 text-gray-800",
                            )}
                          >
                            {note.priority}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-2">
                            {editingNoteId !== note.id && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleStartEditingNote(
                                      note.id,
                                      note.content,
                                    )
                                  }
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteNoteClick(note.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Addresses */}
          <div className="space-y-4 pt-2 border-t">
            <AddressesSection
              contactId={contact.id}
              initialAddresses={
                "addresses" in contact && contact.addresses
                  ? (contact.addresses as Address[])
                  : []
              }
            />
          </div>

          {/* Timestamps */}
          <div className="space-y-4 pt-4 border-t">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Created At</p>
                <p className="text-sm">
                  {new Date(contact.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Updated At</p>
                <p className="text-sm">
                  {new Date(contact.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={() => setIsEditing(true)}>Edit Contact</Button>
            {isArchived ? (
              <Button
                variant="outline"
                onClick={handleRestoreContact}
                disabled={restoreContact.isPending}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore Contact
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleArchiveContact}
                disabled={archiveContact.isPending}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive Contact
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={deleteContact.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Permanently
            </Button>
          </div>
        </CardContent>
      </Card>

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
                {contact.firstName} {contact.lastName}
              </strong>
              ? This action cannot be undone. The contact will be permanently
              removed from your system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
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

      {/* Quick Note Modal */}
      <QuickNoteModal
        open={quickNoteModalOpen}
        onOpenChange={setQuickNoteModalOpen}
        contactId={contact.id}
      />

      {/* Delete Note Confirmation Dialog */}
      <Dialog
        open={deleteNoteDialogOpen}
        onOpenChange={setDeleteNoteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteNoteDialogOpen(false);
                setNoteToDelete(null);
              }}
              disabled={deleteNote.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteNoteConfirm}
              disabled={deleteNote.isPending}
            >
              {deleteNote.isPending ? "Deleting..." : "Delete Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
