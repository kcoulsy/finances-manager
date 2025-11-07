"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { useContacts } from "@/features/contacts/hooks/use-contacts";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { Input } from "@/features/shared/components/ui/input";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { useDebounce } from "@/features/shared/hooks/use-debounce";
import { useCreateProject } from "../hooks/use-create-project";
import { useUpdateProject } from "../hooks/use-update-project";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "../schemas/project.schema";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../schemas/project.schema";

interface ProjectFormProps {
  projectId?: string;
  initialData?: {
    name: string;
    description?: string | null;
    primaryClientId?: string | null;
  };
  currentUserId?: string;
  currentUserEmail?: string;
}

// Validate email format
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export function ProjectForm({
  projectId,
  initialData,
  currentUserId,
  currentUserEmail,
}: ProjectFormProps) {
  const isEdit = !!projectId;
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const [searchContact, setSearchContact] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string>("");
  const debouncedContactSearch = useDebounce(searchContact, 500);

  // Search contacts for selection
  const { data: contactsData } = useContacts({
    search: debouncedContactSearch || undefined,
    limit: 20,
    offset: 0,
  });

  const contacts = contactsData?.contacts || [];
  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    watch,
  } = useForm<CreateProjectInput | UpdateProjectInput>({
    resolver: zodResolver(isEdit ? updateProjectSchema : createProjectSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description || undefined,
          primaryClientId: initialData.primaryClientId || undefined,
          ...(isEdit ? { projectId } : {}),
        }
      : undefined,
  });

  const primaryClientId = watch("primaryClientId");

  // Handle contact selection - when a contact is selected, we need to find the user by email
  // For now, we'll set the primaryClientId to a placeholder and handle the lookup in the action
  // Actually, we need an action to get users from contacts. Let me simplify: just store the contact email
  // and let the action handle finding the user.

  // Actually, looking at the schema, primaryClientId should be a userId.
  // So I need to either:
  // 1. Create an action to search for users by contact email
  // 2. Or allow selecting from a list of users (current user + users matching contacts)

  // For now, let me create a simpler approach: allow selecting "self" or searching contacts
  // When a contact is selected, we'll need to look up the user by email in the action

  // Actually, let me check if there's a way to get users. I think the simplest is:
  // - Allow selecting "self" (currentUserId)
  // - Allow selecting contacts and find their matching user in the action

  // But for the form, let me use a string field that can be:
  // - "self" for current user
  // - An email for a contact (which will be resolved to a user in the action)

  // Actually, let me just allow selecting contacts, and the action will find the user by email
  // Or better: create a server action to get users that can be primary clients

  // Let me simplify: for now, I'll just add a field that accepts a user ID or email
  // and handle the lookup in the action. But that's not great UX.

  // Better approach: Allow selecting from contacts, and when submitting, if a contact is selected,
  // look up the user by email. If the contact doesn't have a matching user, we can't set them as primary client.

  // For now, let me just add a simple select that allows:
  // 1. None (no primary client)
  // 2. Self (if currentUserId is provided)
  // 3. Search contacts (and we'll find the user by email)

  const handleContactSelect = useCallback(
    (contactId: string) => {
      setSelectedContactId(contactId);
      const contact = contacts.find((c) => c.id === contactId);
      if (contact?.email) {
        // Store email in a special format that the action can parse
        // Format: "email:contact@example.com" to distinguish from user IDs
        setValue("primaryClientId", `email:${contact.email}`, {
          shouldValidate: false,
        });
        setSearchContact("");
      }
    },
    [contacts, setValue],
  );

  // Handle selecting self
  const handleSelectSelf = useCallback(() => {
    if (currentUserId) {
      setValue("primaryClientId", currentUserId, {
        shouldValidate: true,
      });
      setSelectedContactId("");
      setSearchContact("");
    }
  }, [currentUserId, setValue]);

  // Handle clearing selection
  const handleClearSelection = useCallback(() => {
    setValue("primaryClientId", undefined, {
      shouldValidate: false,
    });
    setSelectedContactId("");
    setSearchContact("");
    setEmailInput("");
    setEmailError("");
  }, [setValue]);

  // Handle email input change
  const handleEmailInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const email = e.target.value;
      setEmailInput(email);
      setSelectedContactId("");
      setSearchContact("");

      if (email === "") {
        setEmailError("");
        setValue("primaryClientId", undefined, { shouldValidate: false });
        return;
      }

      if (validateEmail(email)) {
        setEmailError("");
        // Store email in the format "email:user@example.com"
        setValue("primaryClientId", `email:${email}`, {
          shouldValidate: false,
        });
      } else {
        setEmailError("Please enter a valid email address");
        setValue("primaryClientId", undefined, { shouldValidate: false });
      }
    },
    [setValue],
  );

  const onSubmit = async (data: CreateProjectInput | UpdateProjectInput) => {
    try {
      if (isEdit) {
        await updateProject.mutateAsync(data as UpdateProjectInput);
      } else {
        await createProject.mutateAsync(data as CreateProjectInput);
      }
      // Toast is shown automatically by the hooks via showToastFromAction
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to save project",
      });
    }
  };

  const isLoading =
    isSubmitting || createProject.isPending || updateProject.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Project" : "Create New Project"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Update your project details"
            : "Add a new project to your workspace"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {errors.root && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.root.message}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Project Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              placeholder="My Project"
              disabled={isLoading}
              aria-invalid={errors.name ? "true" : "false"}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Describe your project..."
              disabled={isLoading}
              aria-invalid={errors.description ? "true" : "false"}
              rows={4}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>
          {!isEdit && (
            <div className="space-y-2">
              <label htmlFor="primaryClient" className="text-sm font-medium">
                Primary Client (Optional)
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  {currentUserId && (
                    <Button
                      type="button"
                      variant={
                        primaryClientId === currentUserId
                          ? "default"
                          : "outline"
                      }
                      onClick={handleSelectSelf}
                      disabled={isLoading}
                      className="shrink-0"
                    >
                      Set as Self
                    </Button>
                  )}
                  {primaryClientId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearSelection}
                      disabled={isLoading}
                      className="shrink-0"
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      id="primaryClientEmail"
                      type="email"
                      placeholder="Enter email address or search contacts..."
                      value={emailInput || searchContact}
                      onChange={(e) => {
                        const value = e.target.value;
                        // If it looks like an email, use email input handler
                        if (value.includes("@")) {
                          handleEmailInputChange(e);
                        } else {
                          // Otherwise use contact search
                          setEmailInput("");
                          setEmailError("");
                          setSearchContact(value);
                          if (selectedContactId) {
                            setSelectedContactId("");
                          }
                        }
                      }}
                      disabled={isLoading}
                      aria-invalid={emailError ? "true" : "false"}
                    />
                    {searchContact &&
                      !emailInput &&
                      contacts.length > 0 &&
                      !selectedContactId &&
                      primaryClientId !== currentUserId && (
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
                  {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                  {emailInput &&
                    !emailError &&
                    primaryClientId?.startsWith("email:") && (
                      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                        <div className="flex-1">
                          <div className="font-medium">Email</div>
                          <div className="text-sm text-muted-foreground">
                            {emailInput}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEmailInput("");
                            setEmailError("");
                            setValue("primaryClientId", undefined);
                          }}
                          disabled={isLoading}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                </div>
                {selectedContact && !emailInput && (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                    <div className="flex-1">
                      <div className="font-medium">
                        {selectedContact.firstName} {selectedContact.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedContact.email}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedContactId("");
                        setSearchContact("");
                        setValue("primaryClientId", undefined);
                      }}
                      disabled={isLoading}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                {primaryClientId === currentUserId && currentUserEmail && (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                    <div className="flex-1">
                      <div className="font-medium">Self</div>
                      <div className="text-sm text-muted-foreground">
                        {currentUserEmail}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSelection}
                      disabled={isLoading}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
              <input type="hidden" {...register("primaryClientId")} />
            </div>
          )}
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
                ? "Update Project"
                : "Create Project"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
