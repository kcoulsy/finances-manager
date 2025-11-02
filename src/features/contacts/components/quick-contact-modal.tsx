"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Controller,
  type Resolver,
  type SubmitHandler,
  useForm,
} from "react-hook-form";
import { Button } from "@/features/shared/components/ui/button";
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
import { showToastFromAction } from "@/features/shared/lib/actions/toast";
import { createContactAction } from "../actions/create-contact.action";
import type {
  CreateContactInput,
  QuickContactInput,
} from "../schemas/contact.schema";
import { quickContactSchema } from "../schemas/contact.schema";

const statusOptions: SelectOption[] = [
  { value: "PERSONAL", label: "Personal Contact" },
  { value: "ENQUIRY", label: "Enquiry" },
  { value: "CLIENT", label: "Client" },
  { value: "SUPPLIER", label: "Supplier" },
];

interface QuickContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickContactModal({
  open,
  onOpenChange,
}: QuickContactModalProps) {
  const queryClient = useQueryClient();
  const [isClosing, setIsClosing] = useState(false);

  const createContact = useMutation({
    mutationFn: async (data: CreateContactInput) => {
      const result = await createContactAction(data);

      // Show toast from action result (handles both errors and success toasts)
      showToastFromAction(result as Parameters<typeof showToastFromAction>[0]);

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (result?.data?.success) {
        return result.data.contact;
      }

      throw new Error("Failed to create contact");
    },
    onSuccess: () => {
      // Invalidate contacts query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      // Don't redirect - just close the modal
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<QuickContactInput>({
    resolver: zodResolver(quickContactSchema) as Resolver<QuickContactInput>,
    defaultValues: {
      status: "ENQUIRY" as const,
    },
  });

  const onSubmit: SubmitHandler<QuickContactInput> = async (data) => {
    try {
      // Convert quick contact input to full create contact input
      await createContact.mutateAsync({
        ...data,
        role: undefined,
        engagement: undefined,
        phoneHome: undefined,
        phoneWork: undefined,
        notes: undefined,
        personalWebsite: undefined,
        linkedinUrl: undefined,
        twitterHandle: undefined,
        facebookUrl: undefined,
        instagramHandle: undefined,
        companyName: undefined,
        companyWebsite: undefined,
        vatNumber: undefined,
        registrationNumber: undefined,
        accountsEmail: undefined,
        position: undefined,
      });
      // Close modal after successful creation
      reset();
      onOpenChange(false);
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to create contact",
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isClosing) {
      setIsClosing(true);
      reset();
      setTimeout(() => {
        setIsClosing(false);
        onOpenChange(false);
      }, 200);
    } else {
      onOpenChange(newOpen);
    }
  };

  const isLoading = isSubmitting || createContact.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick New Contact</DialogTitle>
          <DialogDescription>
            Add a new contact to your address book
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit as SubmitHandler<QuickContactInput>)}
        >
          <div className="space-y-4 py-4">
            {errors.root && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {errors.root.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium">
                  First Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="firstName"
                  placeholder="John"
                  disabled={isLoading}
                  aria-invalid={errors.firstName ? "true" : "false"}
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium">
                  Last Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  disabled={isLoading}
                  aria-invalid={errors.lastName ? "true" : "false"}
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-destructive">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                disabled={isLoading}
                aria-invalid={errors.email ? "true" : "false"}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="phoneMobile" className="text-sm font-medium">
                Phone <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="phoneMobile"
                type="tel"
                placeholder="+1 234 567 8900"
                disabled={isLoading}
                aria-invalid={errors.phoneMobile ? "true" : "false"}
                {...register("phoneMobile")}
              />
              {errors.phoneMobile && (
                <p className="text-sm text-destructive">
                  {errors.phoneMobile.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || "ENQUIRY"}
                    onValueChange={field.onChange}
                    options={statusOptions}
                    placeholder="Select status..."
                  />
                )}
              />
              {errors.status && (
                <p className="text-sm text-destructive">
                  {errors.status.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
