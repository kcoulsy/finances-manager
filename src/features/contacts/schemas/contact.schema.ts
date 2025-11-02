import { z } from "zod";

// Contact role enum
export const contactRoleSchema = z.enum([
  "Client",
  "Contractor",
  "Supplier",
  "Team Member",
  "Other",
]);

// Contact status enum
export const contactStatusSchema = z.enum([
  "PERSONAL",
  "ENQUIRY",
  "CLIENT",
  "SUPPLIER",
]);

// Contact engagement enum
export const contactEngagementSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
]);

// Quick contact schema - basic fields only
export const quickContactSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters"),
  email: z.string().email("Invalid email address"),
  phoneMobile: z
    .string()
    .max(32, "Phone number must be less than 32 characters")
    .optional(),
  status: contactStatusSchema.default("PERSONAL"),
});

// Create contact schema - full fields
export const createContactSchema = z.object({
  role: z
    .enum(["Client", "Contractor", "Supplier", "Team Member", "Other"])
    .optional(),
  status: contactStatusSchema.default("PERSONAL"),
  engagement: contactEngagementSchema.optional(),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters"),
  email: z.string().email("Invalid email address"),
  phoneMobile: z
    .string()
    .max(32, "Phone number must be less than 32 characters")
    .optional(),
  phoneHome: z
    .string()
    .max(32, "Phone number must be less than 32 characters")
    .optional(),
  phoneWork: z
    .string()
    .max(32, "Phone number must be less than 32 characters")
    .optional(),
  notes: z.string().optional(),
  personalWebsite: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitterHandle: z.string().max(50, "Twitter handle must be less than 50 characters").optional(),
  facebookUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  instagramHandle: z.string().max(50, "Instagram handle must be less than 50 characters").optional(),
  companyName: z.string().max(200, "Company name must be less than 200 characters").optional(),
  companyWebsite: z.string().max(500, "Company website must be less than 500 characters").optional(),
  vatNumber: z.string().max(100, "VAT number must be less than 100 characters").optional(),
  registrationNumber: z.string().max(100, "Registration number must be less than 100 characters").optional(),
  accountsEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  position: z.string().max(100, "Position must be less than 100 characters").optional(),
});

// Update contact schema
export const updateContactSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
  role: z
    .enum(["Client", "Contractor", "Supplier", "Team Member", "Other"])
    .optional(),
  status: contactStatusSchema.optional(),
  engagement: contactEngagementSchema.optional(),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters"),
  email: z.string().email("Invalid email address"),
  phoneMobile: z
    .string()
    .max(32, "Phone number must be less than 32 characters")
    .optional(),
  phoneHome: z
    .string()
    .max(32, "Phone number must be less than 32 characters")
    .optional(),
  phoneWork: z
    .string()
    .max(32, "Phone number must be less than 32 characters")
    .optional(),
  notes: z.string().optional(),
  personalWebsite: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitterHandle: z.string().max(50, "Twitter handle must be less than 50 characters").optional(),
  facebookUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  instagramHandle: z.string().max(50, "Instagram handle must be less than 50 characters").optional(),
  companyName: z.string().max(200, "Company name must be less than 200 characters").optional(),
  companyWebsite: z.string().max(500, "Company website must be less than 500 characters").optional(),
  vatNumber: z.string().max(100, "VAT number must be less than 100 characters").optional(),
  registrationNumber: z.string().max(100, "Registration number must be less than 100 characters").optional(),
  accountsEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  position: z.string().max(100, "Position must be less than 100 characters").optional(),
});

// Get contact schema
export const getContactSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
});

// Delete contact schema
export const deleteContactSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
});

// List contacts schema
export const listContactsSchema = z.object({
  limit: z.number().min(1).max(100).default(50).optional(),
  offset: z.number().min(0).default(0).optional(),
  status: contactStatusSchema.optional(),
  engagement: contactEngagementSchema.optional(),
  role: z
    .enum(["Client", "Contractor", "Supplier", "Team Member", "Other"])
    .optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  includeArchived: z.boolean().optional(),
});

// Import contacts schema
export const importContactsSchema = z.object({
  fileContent: z.string().min(1, "File content is required"),
  fileType: z.enum(["vcard", "csv"], {
    message: "File type must be vcard or csv",
  }),
});

// Bulk archive contacts schema
export const bulkArchiveContactsSchema = z.object({
  contactIds: z.array(z.string().min(1, "Contact ID is required")).min(1, "At least one contact ID is required"),
});

// Bulk delete contacts schema
export const bulkDeleteContactsSchema = z.object({
  contactIds: z.array(z.string().min(1, "Contact ID is required")).min(1, "At least one contact ID is required"),
});

// Type exports
export type ContactRoleType = z.infer<typeof contactRoleSchema>;
export type ContactStatusType = z.infer<typeof contactStatusSchema>;
export type ContactEngagementType = z.infer<typeof contactEngagementSchema>;
export type QuickContactInput = z.infer<typeof quickContactSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type GetContactInput = z.infer<typeof getContactSchema>;
export type DeleteContactInput = z.infer<typeof deleteContactSchema>;
export type ListContactsInput = z.infer<typeof listContactsSchema>;
export type ImportContactsInput = z.infer<typeof importContactsSchema>;
export type BulkArchiveContactsInput = z.infer<typeof bulkArchiveContactsSchema>;
export type BulkDeleteContactsInput = z.infer<typeof bulkDeleteContactsSchema>;

