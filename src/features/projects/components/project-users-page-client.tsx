"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Contact, Info, Mail, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { QuickContactModal } from "@/features/contacts/components/quick-contact-modal";
import { useContacts } from "@/features/contacts/hooks/use-contacts";
import {
  DataTable,
  type DataTableColumn,
} from "@/features/shared/components/data-table/data-table";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/features/shared/components/ui/avatar";
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
import { Input } from "@/features/shared/components/ui/input";
import {
  Select,
  type SelectOption,
} from "@/features/shared/components/ui/select";
import { useDebounce } from "@/features/shared/hooks/use-debounce";
import {
  PROJECT_PERMISSION_CATEGORIES,
  PROJECT_PERMISSION_DESCRIPTIONS,
  PROJECT_ROLE_PERMISSIONS,
} from "../constants/project-permissions";
import { useCancelInvitation } from "../hooks/use-cancel-invitation";
import { useInviteProjectUser } from "../hooks/use-invite-project-user";
import { useListProjectUsers } from "../hooks/use-list-project-users";
import { useRemoveProjectUser } from "../hooks/use-remove-project-user";
import {
  type InviteProjectUserInput,
  inviteProjectUserSchema,
} from "../schemas/project-user.schema";
import { ProjectPermissionsModal } from "./project-permissions-modal";

const userTypeOptions: SelectOption[] = [
  { value: "Client", label: "Client" },
  { value: "Contractor", label: "Contractor" },
  { value: "Employee", label: "Employee" },
  { value: "Legal", label: "Legal" },
];

interface ProjectUsersPageClientProps {
  projectId: string;
  projectName: string;
  projectOwnerId?: string;
}

type ProjectUserEntry = {
  type: "user" | "invitation";
  id: string;
  userType: "Client" | "Contractor" | "Employee" | "Legal";
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
  email: string;
  createdAt: Date;
  invitation?: {
    id: string;
    status: string;
    expiresAt: Date;
  };
};

export function ProjectUsersPageClient({
  projectId,
  projectName,
  projectOwnerId,
}: ProjectUsersPageClientProps) {
  const [page, setPage] = useState(1);
  const [searchContact, setSearchContact] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quickContactOpen, setQuickContactOpen] = useState(false);
  const [quickContactEmail, setQuickContactEmail] = useState<string>("");
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<
    "OWNER" | "MEMBER" | "INVITED"
  >("MEMBER");
  const [userToDelete, setUserToDelete] = useState<{
    id: string;
    userType: "Client" | "Contractor" | "Employee" | "Legal";
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
    createdAt: Date;
  } | null>(null);
  const limit = 10;
  const debouncedContactSearch = useDebounce(searchContact, 500);

  const inviteUser = useInviteProjectUser();
  const removeUser = useRemoveProjectUser();
  const cancelInvitation = useCancelInvitation();

  const { data, isLoading, error } = useListProjectUsers({
    projectId,
    page,
    limit,
  });

  // Search contacts for selection
  const { data: contactsData } = useContacts({
    search: debouncedContactSearch || undefined,
    limit: 20,
    offset: 0,
  });

  const contacts = contactsData?.contacts || [];
  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  // Get email to contact map from project users data
  const emailToContactMap = useMemo(() => {
    const map = new Map<string, string>();
    const contactMap = data?.emailToContactMap || {};

    // Convert the record to a Map for consistent lookup
    Object.entries(contactMap).forEach(([email, contactId]) => {
      map.set(email, contactId);
    });

    return map;
  }, [data?.emailToContactMap]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
    watch,
    setValue,
  } = useForm<InviteProjectUserInput>({
    resolver: zodResolver(inviteProjectUserSchema),
    defaultValues: {
      projectId,
      email: "",
      userType: "Client",
    },
  });

  const userType = watch("userType");
  const emailValue = watch("email");

  // Component to display permissions for selected user type
  // Note: All user types (Client, Contractor, Employee, Legal) receive MEMBER role permissions
  function UserTypePermissionsDisplay({
    userType: _userType,
  }: {
    userType: "Client" | "Contractor" | "Employee" | "Legal";
  }) {
    // All user types (Client, Contractor, Employee, Legal) receive MEMBER role permissions
    const userPermissions = new Set(PROJECT_ROLE_PERMISSIONS.MEMBER || []);

    // Filter categories to only show those with at least one permission the user has
    const visibleCategories = PROJECT_PERMISSION_CATEGORIES.filter((category) =>
      category.permissions.some((perm) => userPermissions.has(perm)),
    );

    return (
      <div className="space-y-2">
        {visibleCategories.map((category) => {
          // Get permissions in this category that the user actually has
          const categoryPermissions = category.permissions.filter((perm) =>
            userPermissions.has(perm),
          );

          if (categoryPermissions.length === 0) {
            return null;
          }

          return (
            <div key={category.name} className="space-y-1">
              <div className="font-medium text-xs">{category.name}</div>
              <ul className="list-none space-y-0.5 pl-2">
                {categoryPermissions.map((permission) => {
                  const description =
                    PROJECT_PERMISSION_DESCRIPTIONS[permission];
                  return (
                    <li
                      key={permission}
                      className="text-xs text-muted-foreground"
                    >
                      <span className="text-muted-foreground">•</span>{" "}
                      {description}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    );
  }

  // Update email when contact is selected
  const handleContactSelect = useCallback(
    (contactId: string) => {
      setSelectedContactId(contactId);
      const contact = contacts.find((c) => c.id === contactId);
      if (contact) {
        setValue("email", contact.email, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setSearchContact("");
      }
    },
    [contacts, setValue],
  );

  // Clear selected contact when email is manually typed
  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const email = e.target.value;
      if (email && email !== selectedContact?.email) {
        setSelectedContactId("");
      }
      setValue("email", email);
    },
    [selectedContact?.email, setValue],
  );

  const onSubmit = async (data: InviteProjectUserInput) => {
    try {
      await inviteUser.mutateAsync(data);
      reset();
      setSelectedContactId("");
      setSearchContact("");
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to send invitation",
      });
    }
  };

  const handleDeleteClick = useCallback((entry: ProjectUserEntry) => {
    if (entry.type === "user" && entry.user) {
      setUserToDelete({
        id: entry.id,
        userType: entry.userType,
        user: entry.user,
        createdAt: entry.createdAt,
      });
      setDeleteDialogOpen(true);
    }
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!userToDelete) return;

    try {
      await removeUser.mutateAsync({
        projectId,
        userId: userToDelete.user.id,
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch {
      // Error handled by toast
    }
  }, [userToDelete, projectId, removeUser]);

  const handleCancelInvitation = useCallback(
    async (invitationId: string) => {
      try {
        await cancelInvitation.mutateAsync({ invitationId });
      } catch {
        // Error handled by toast
      }
    },
    [cancelInvitation],
  );

  const handleAddToContacts = useCallback((email: string) => {
    setQuickContactEmail(email);
    setQuickContactOpen(true);
  }, []);

  const entries = data?.entries || [];
  const total = data?.total || 0;

  const columns: DataTableColumn<ProjectUserEntry>[] = [
    {
      key: "user",
      header: "User",
      render: (entry) => {
        // Normalize email for lookup (trim and lowercase)
        const normalizedEmail = entry.email?.trim().toLowerCase() || "";
        const contactId = normalizedEmail
          ? emailToContactMap.get(normalizedEmail)
          : undefined;
        const displayName = entry.user ? entry.user.name : entry.email;

        return (
          <div className="flex items-center gap-3">
            {entry.user ? (
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={entry.user.image || undefined}
                  alt={entry.user.name}
                />
                <AvatarFallback>
                  {entry.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {contactId ? (
                  <Link
                    href={`/contacts/${contactId}`}
                    className="font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {displayName}
                  </Link>
                ) : (
                  <>
                    <span className="font-medium">{displayName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddToContacts(entry.email)}
                      className="h-6 px-2 text-xs"
                      title="Add to contacts"
                    >
                      <Contact className="h-3 w-3 mr-1" />
                      Add to Contacts
                    </Button>
                  </>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {entry.email}
                {entry.type === "invitation" && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    <Mail className="h-3 w-3" />
                    Pending Invitation
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "userType",
      header: "Type",
      render: (entry) => {
        // Determine role based on entry type and project owner
        const role =
          entry.type === "invitation"
            ? ("INVITED" as const)
            : entry.user?.id === projectOwnerId
              ? ("OWNER" as const)
              : ("MEMBER" as const);

        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">{entry.userType}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedRole(role);
                setPermissionsModalOpen(true);
              }}
              className="h-6 px-2 text-xs"
              title="View permissions for this role"
            >
              <Info className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (entry) =>
        entry.type === "user" && entry.user ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(entry)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : entry.type === "invitation" ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCancelInvitation(entry.id)}
            disabled={cancelInvitation.isPending}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null,
    },
  ];

  const isLoadingForm = isSubmitting || inviteUser.isPending;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Project Users</h1>
        <p className="text-muted-foreground mt-2">
          Manage users for {projectName}
        </p>
      </div>

      {/* Invite User Form */}
      <Card>
        <CardHeader>
          <CardTitle>Invite User</CardTitle>
          <CardDescription>
            Invite a user to this project by selecting a contact or entering an
            email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Horizontal Form Fields */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              {/* Contact Search/Email */}
              <div className="flex-1 gap-2">
                <label htmlFor="contact" className="text-sm font-medium">
                  Search Contacts or Enter Email *
                </label>
                <div className="relative">
                  <Input
                    id="contact"
                    type="text"
                    placeholder="Search contacts or enter email..."
                    value={searchContact}
                    className="mb-2"
                    onChange={(e) => {
                      setSearchContact(e.target.value);
                      if (selectedContactId) {
                        setSelectedContactId("");
                      }
                    }}
                    disabled={isLoadingForm}
                  />
                  {searchContact &&
                    contacts.length > 0 &&
                    !selectedContactId && (
                      <div className="absolute z-10 mt-1 w-full border rounded-md bg-background shadow-lg max-h-48 overflow-y-auto">
                        {contacts.map((contact) => (
                          <button
                            key={contact.id}
                            type="button"
                            onClick={() => handleContactSelect(contact.id)}
                            className="w-full text-left px-3 py-2 hover:bg-accent"
                          >
                            <div className="font-medium">
                              {contact.firstName} {contact.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {contact.email}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
                {/* Selected Contact Display */}
                {selectedContact && (
                  <div className="flex items-center gap-2 rounded-md border bg-primary/5 p-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {selectedContact.firstName} {selectedContact.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedContact.email} (Existing Contact)
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedContactId("");
                        setValue("email", "");
                        setSearchContact("");
                      }}
                      className="h-6 w-6 p-0 shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {/* Email Input (always present, hidden when contact selected) */}
                {selectedContactId ? (
                  <input
                    type="hidden"
                    {...register("email")}
                    value={selectedContact?.email || ""}
                  />
                ) : (
                  <>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      disabled={isLoadingForm}
                      aria-invalid={errors.email ? "true" : "false"}
                      {...register("email")}
                      onChange={handleEmailChange}
                      value={emailValue || ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* User Type */}
              <div className="space-y-2 md:w-48">
                <label htmlFor="userType" className="text-sm font-medium">
                  User Type *
                </label>
                <Select
                  value={userType}
                  onValueChange={(value) =>
                    setValue(
                      "userType",
                      value as "Client" | "Contractor" | "Employee" | "Legal",
                    )
                  }
                  options={userTypeOptions}
                />
                {errors.userType && (
                  <p className="text-sm text-destructive">
                    {errors.userType.message}
                  </p>
                )}
                {/* Permissions Display */}
                {userType && (
                  <div className="mt-2 rounded-md border bg-muted/50 p-3 text-xs">
                    <div className="font-semibold mb-2">
                      Permissions for {userType}
                    </div>
                    <UserTypePermissionsDisplay userType={userType} />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex items-end">
                <Button type="submit" disabled={isLoadingForm}>
                  {isLoadingForm ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </div>

            {errors.root && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {errors.root.message}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Project Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Project Users</CardTitle>
          <CardDescription>
            Users and pending invitations for this project
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 w-full min-w-0 overflow-hidden">
          <DataTable
            data={entries}
            columns={columns}
            isLoading={isLoading}
            error={error}
            pagination={
              total > 0
                ? {
                    page,
                    limit,
                    totalCount: total,
                    totalPages: Math.ceil(total / limit),
                  }
                : undefined
            }
            onPageChange={setPage}
            emptyMessage="No users or invitations for this project yet."
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {userToDelete?.user.name || userToDelete?.user.email}
              </strong>{" "}
              from this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={removeUser.isPending}
            >
              {removeUser.isPending ? "Removing..." : "Remove User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Contact Modal */}
      <QuickContactModal
        open={quickContactOpen}
        onOpenChange={(open) => {
          setQuickContactOpen(open);
          if (!open) {
            setQuickContactEmail("");
          }
        }}
        initialEmail={quickContactEmail}
      />

      {/* Project Permissions Modal */}
      <ProjectPermissionsModal
        open={permissionsModalOpen}
        onOpenChange={setPermissionsModalOpen}
        role={selectedRole}
      />
    </div>
  );
}
