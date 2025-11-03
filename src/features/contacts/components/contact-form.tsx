"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ContactStatus } from "@prisma/client";
import { Building, ChevronDown, Edit, Phone, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/features/shared/components/ui/collapsible";
import { Input } from "@/features/shared/components/ui/input";
import type { SelectOption } from "@/features/shared/components/ui/select";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { cn } from "@/features/shared/lib/utils/index";
import { useCreateContact } from "../hooks/use-create-contact";
import { useUpdateContact } from "../hooks/use-update-contact";
import type {
  CreateContactInput,
  UpdateContactInput,
} from "../schemas/contact.schema";
import {
  createContactSchema,
  updateContactSchema,
} from "../schemas/contact.schema";
import { ContactTypeSelector } from "./contact-type-selector";

interface ContactFormProps {
  contactId?: string;
  initialData?: {
    role?: string | null;
    status: string;
    engagement?: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phoneMobile?: string | null;
    phoneHome?: string | null;
    phoneWork?: string | null;
    notes?: string | null;
    personalWebsite?: string | null;
    linkedinUrl?: string | null;
    twitterHandle?: string | null;
    facebookUrl?: string | null;
    instagramHandle?: string | null;
    companyName?: string | null;
    companyWebsite?: string | null;
    vatNumber?: string | null;
    registrationNumber?: string | null;
    accountsEmail?: string | null;
    position?: string | null;
  };
}

const _roleOptions: SelectOption[] = [
  { value: "Client", label: "Client" },
  { value: "Contractor", label: "Contractor" },
  { value: "Supplier", label: "Supplier" },
  { value: "Team Member", label: "Team Member" },
  { value: "Other", label: "Other" },
];

const _statusOptions: SelectOption[] = [
  { value: "PERSONAL", label: "Personal Contact" },
  { value: "ENQUIRY", label: "Enquiry" },
  { value: "CLIENT", label: "Client" },
  { value: "SUPPLIER", label: "Supplier" },
];

const _engagementOptions: SelectOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
];

export function ContactForm({ contactId, initialData }: ContactFormProps) {
  const isEdit = !!contactId;
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const [companyInfoOpen, setCompanyInfoOpen] = useState(false);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(isEdit ? updateContactSchema : createContactSchema),
    defaultValues: initialData
      ? {
          role:
            (initialData.role as
              | "Client"
              | "Contractor"
              | "Supplier"
              | "Team Member"
              | "Other") || undefined,
          status: initialData.status as
            | "PERSONAL"
            | "ENQUIRY"
            | "CLIENT"
            | "SUPPLIER",
          engagement:
            (initialData.engagement as "ACTIVE" | "INACTIVE" | "SUSPENDED") ||
            undefined,
          firstName: initialData.firstName,
          lastName: initialData.lastName,
          email: initialData.email,
          phoneMobile: initialData.phoneMobile || undefined,
          phoneHome: initialData.phoneHome || undefined,
          phoneWork: initialData.phoneWork || undefined,
          notes: initialData.notes || undefined,
          personalWebsite: initialData.personalWebsite || undefined,
          linkedinUrl: initialData.linkedinUrl || undefined,
          twitterHandle: initialData.twitterHandle || undefined,
          facebookUrl: initialData.facebookUrl || undefined,
          instagramHandle: initialData.instagramHandle || undefined,
          companyName: initialData.companyName || undefined,
          companyWebsite: initialData.companyWebsite || undefined,
          vatNumber: initialData.vatNumber || undefined,
          registrationNumber: initialData.registrationNumber || undefined,
          accountsEmail: initialData.accountsEmail || undefined,
          position: initialData.position || undefined,
          ...(isEdit ? { contactId } : {}),
        }
      : {
          status: "PERSONAL" as const,
        },
  });

  const watchedStatus = watch("status") as ContactStatus | undefined;

  const onSubmit = async (data: CreateContactInput | UpdateContactInput) => {
    try {
      if (isEdit) {
        await updateContact.mutateAsync(data as UpdateContactInput);
      } else {
        await createContact.mutateAsync(data as CreateContactInput);
      }
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to save contact",
      });
    }
  };

  const isLoading =
    isSubmitting || createContact.isPending || updateContact.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Contact" : "Create New Contact"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Update your contact information"
            : "Add a new contact to your address book"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {errors.root && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.root.message}
            </div>
          )}

          {/* Contact Type Selection - only show on create */}
          {!isEdit && (
            <>
              <ContactTypeSelector
                value={watchedStatus}
                onChange={(type) => setValue("status", type)}
              />
              <input type="hidden" {...register("status")} />
              {errors.status && (
                <p className="text-sm text-destructive">
                  {errors.status.message}
                </p>
              )}
            </>
          )}

          {/* Personal Information Section */}
          {watchedStatus && (
            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address <span className="text-destructive">*</span>
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
                  <label
                    htmlFor="personalWebsite"
                    className="text-sm font-medium"
                  >
                    Personal Website{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    id="personalWebsite"
                    type="url"
                    placeholder="https://example.com"
                    disabled={isLoading}
                    aria-invalid={errors.personalWebsite ? "true" : "false"}
                    {...register("personalWebsite")}
                  />
                  {errors.personalWebsite && (
                    <p className="text-sm text-destructive">
                      {errors.personalWebsite.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contact Information Section */}
          {watchedStatus && (
            <div className="space-y-4 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Contact Information</h3>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Phone Numbers</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="phoneMobile"
                      className="text-sm font-medium"
                    >
                      Mobile
                    </label>
                    <Input
                      id="phoneMobile"
                      type="tel"
                      placeholder="07123 456789"
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
                    <label htmlFor="phoneHome" className="text-sm font-medium">
                      Home
                    </label>
                    <Input
                      id="phoneHome"
                      type="tel"
                      placeholder="01234 567890"
                      disabled={isLoading}
                      aria-invalid={errors.phoneHome ? "true" : "false"}
                      {...register("phoneHome")}
                    />
                    {errors.phoneHome && (
                      <p className="text-sm text-destructive">
                        {errors.phoneHome.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="phoneWork" className="text-sm font-medium">
                      Work
                    </label>
                    <Input
                      id="phoneWork"
                      type="tel"
                      placeholder="020 1234 5678"
                      disabled={isLoading}
                      aria-invalid={errors.phoneWork ? "true" : "false"}
                      {...register("phoneWork")}
                    />
                    {errors.phoneWork && (
                      <p className="text-sm text-destructive">
                        {errors.phoneWork.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Social Media Section */}
          {watchedStatus && (
            <div className="space-y-4 pt-2 border-t">
              <h3 className="text-sm font-semibold">Social Media</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="linkedinUrl" className="text-sm font-medium">
                    LinkedIn Profile URL
                  </label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    disabled={isLoading}
                    aria-invalid={errors.linkedinUrl ? "true" : "false"}
                    {...register("linkedinUrl")}
                  />
                  {errors.linkedinUrl && (
                    <p className="text-sm text-destructive">
                      {errors.linkedinUrl.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="twitterHandle"
                    className="text-sm font-medium"
                  >
                    Twitter/X Handle
                  </label>
                  <Input
                    id="twitterHandle"
                    placeholder="@username"
                    disabled={isLoading}
                    aria-invalid={errors.twitterHandle ? "true" : "false"}
                    {...register("twitterHandle")}
                  />
                  {errors.twitterHandle && (
                    <p className="text-sm text-destructive">
                      {errors.twitterHandle.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="facebookUrl" className="text-sm font-medium">
                    Facebook URL
                  </label>
                  <Input
                    id="facebookUrl"
                    type="url"
                    placeholder="https://facebook.com/username"
                    disabled={isLoading}
                    aria-invalid={errors.facebookUrl ? "true" : "false"}
                    {...register("facebookUrl")}
                  />
                  {errors.facebookUrl && (
                    <p className="text-sm text-destructive">
                      {errors.facebookUrl.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="instagramHandle"
                    className="text-sm font-medium"
                  >
                    Instagram Handle
                  </label>
                  <Input
                    id="instagramHandle"
                    placeholder="@username"
                    disabled={isLoading}
                    aria-invalid={errors.instagramHandle ? "true" : "false"}
                    {...register("instagramHandle")}
                  />
                  {errors.instagramHandle && (
                    <p className="text-sm text-destructive">
                      {errors.instagramHandle.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Company Information - collapsible section */}
          {watchedStatus && (
            <Collapsible
              open={companyInfoOpen}
              onOpenChange={setCompanyInfoOpen}
              className="space-y-4 pt-2 border-t"
            >
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between p-0 h-auto font-semibold"
                >
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Company Information</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      companyInfoOpen && "transform rotate-180",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="companyName"
                      className="text-sm font-medium"
                    >
                      Company Name
                    </label>
                    <Input
                      id="companyName"
                      placeholder="Enter company name"
                      disabled={isLoading}
                      aria-invalid={errors.companyName ? "true" : "false"}
                      {...register("companyName")}
                    />
                    {errors.companyName && (
                      <p className="text-sm text-destructive">
                        {errors.companyName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="companyWebsite"
                      className="text-sm font-medium"
                    >
                      Company Website
                    </label>
                    <Input
                      id="companyWebsite"
                      placeholder="example.com"
                      disabled={isLoading}
                      aria-invalid={errors.companyWebsite ? "true" : "false"}
                      {...register("companyWebsite")}
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll automatically add https:// if needed
                    </p>
                    {errors.companyWebsite && (
                      <p className="text-sm text-destructive">
                        {errors.companyWebsite.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="vatNumber" className="text-sm font-medium">
                      VAT Number{" "}
                      <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <Input
                      id="vatNumber"
                      placeholder="Enter VAT number"
                      disabled={isLoading}
                      aria-invalid={errors.vatNumber ? "true" : "false"}
                      {...register("vatNumber")}
                    />
                    {errors.vatNumber && (
                      <p className="text-sm text-destructive">
                        {errors.vatNumber.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="registrationNumber"
                      className="text-sm font-medium"
                    >
                      Company Registration Number{" "}
                      <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <Input
                      id="registrationNumber"
                      placeholder="Enter registration number"
                      disabled={isLoading}
                      aria-invalid={
                        errors.registrationNumber ? "true" : "false"
                      }
                      {...register("registrationNumber")}
                    />
                    {errors.registrationNumber && (
                      <p className="text-sm text-destructive">
                        {errors.registrationNumber.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="accountsEmail"
                      className="text-sm font-medium"
                    >
                      Accounts Email{" "}
                      <span className="text-muted-foreground">(Optional)</span>
                    </label>
                    <Input
                      id="accountsEmail"
                      type="email"
                      placeholder="accounts@company.com"
                      disabled={isLoading}
                      aria-invalid={errors.accountsEmail ? "true" : "false"}
                      {...register("accountsEmail")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Company accounting/payment email
                    </p>
                    {errors.accountsEmail && (
                      <p className="text-sm text-destructive">
                        {errors.accountsEmail.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="position" className="text-sm font-medium">
                      Role/Position
                    </label>
                    <Input
                      id="position"
                      placeholder="e.g., Director, Manager, Owner"
                      disabled={isLoading}
                      aria-invalid={errors.position ? "true" : "false"}
                      {...register("position")}
                    />
                    {errors.position && (
                      <p className="text-sm text-destructive">
                        {errors.position.message}
                      </p>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Additional Information */}
          <Collapsible
            open={additionalInfoOpen}
            onOpenChange={setAdditionalInfoOpen}
            className="space-y-4 pt-2 border-t"
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between p-0 h-auto font-semibold"
              >
                <div className="flex items-center gap-2">
                  <Edit className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Additional Information</span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    additionalInfoOpen && "transform rotate-180",
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-4">
              <Textarea
                id="notes"
                placeholder="Add additional information about this contact (e.g., preferences, special requirements, etc.)..."
                disabled={isLoading}
                aria-invalid={errors.notes ? "true" : "false"}
                rows={4}
                {...register("notes")}
              />
              {errors.notes && (
                <p className="text-sm text-destructive">
                  {errors.notes.message}
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
                ? "Update Contact"
                : "Create Contact"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
