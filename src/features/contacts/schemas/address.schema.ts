import { z } from "zod";

// Address type enum
export const addressTypeSchema = z.enum([
  "HOME",
  "WORK",
  "BILLING",
  "SHIPPING",
  "OTHER",
]);

// Base address schema (used for validation)
export const addressSchema = z.object({
  type: addressTypeSchema.default("OTHER"),
  label: z
    .string()
    .max(100, "Label must be less than 100 characters")
    .optional(),
  addressLine1: z
    .string()
    .min(1, "Address line 1 is required")
    .max(200, "Address line 1 must be less than 200 characters"),
  addressLine2: z
    .string()
    .max(200, "Address line 2 must be less than 200 characters")
    .optional(),
  locality: z
    .string()
    .max(100, "Locality must be less than 100 characters")
    .optional(),
  city: z
    .string()
    .min(1, "City is required")
    .max(100, "City must be less than 100 characters"),
  county: z
    .string()
    .max(100, "County must be less than 100 characters")
    .optional(),
  postalCode: z
    .string()
    .min(1, "Postal code is required")
    .max(20, "Postal code must be less than 20 characters"),
  country: z
    .string()
    .min(1, "Country is required")
    .max(100, "Country must be less than 100 characters"),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

// Create address schema (includes addressable info)
export const createAddressSchema = z.object({
  addressableType: z.enum(["Contact", "Project"]),
  addressableId: z.string().min(1, "Addressable ID is required"),
  type: addressTypeSchema.default("OTHER"),
  label: z
    .string()
    .max(100, "Label must be less than 100 characters")
    .optional(),
  addressLine1: z
    .string()
    .min(1, "Address line 1 is required")
    .max(200, "Address line 1 must be less than 200 characters"),
  addressLine2: z
    .string()
    .max(200, "Address line 2 must be less than 200 characters")
    .optional(),
  locality: z
    .string()
    .max(100, "Locality must be less than 100 characters")
    .optional(),
  city: z
    .string()
    .min(1, "City is required")
    .max(100, "City must be less than 100 characters"),
  county: z
    .string()
    .max(100, "County must be less than 100 characters")
    .optional(),
  postalCode: z
    .string()
    .min(1, "Postal code is required")
    .max(20, "Postal code must be less than 20 characters"),
  country: z
    .string()
    .min(1, "Country is required")
    .max(100, "Country must be less than 100 characters"),
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

// Update address schema
export const updateAddressSchema = z.object({
  addressId: z.string().min(1, "Address ID is required"),
  type: addressTypeSchema.optional(),
  label: z
    .string()
    .max(100, "Label must be less than 100 characters")
    .optional(),
  addressLine1: z
    .string()
    .min(1, "Address line 1 is required")
    .max(200, "Address line 1 must be less than 200 characters")
    .optional(),
  addressLine2: z
    .string()
    .max(200, "Address line 2 must be less than 200 characters")
    .optional(),
  locality: z
    .string()
    .max(100, "Locality must be less than 100 characters")
    .optional(),
  city: z
    .string()
    .min(1, "City is required")
    .max(100, "City must be less than 100 characters")
    .optional(),
  county: z
    .string()
    .max(100, "County must be less than 100 characters")
    .optional(),
  postalCode: z
    .string()
    .min(1, "Postal code is required")
    .max(20, "Postal code must be less than 20 characters")
    .optional(),
  country: z
    .string()
    .min(1, "Country is required")
    .max(100, "Country must be less than 100 characters")
    .optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

// Delete address schema
export const deleteAddressSchema = z.object({
  addressId: z.string().min(1, "Address ID is required"),
});

// List addresses schema
export const listAddressesSchema = z.object({
  addressableType: z.enum(["Contact", "Project"]),
  addressableId: z.string().min(1, "Addressable ID is required"),
});

// Type exports
export type AddressTypeType = z.infer<typeof addressTypeSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type DeleteAddressInput = z.infer<typeof deleteAddressSchema>;
export type ListAddressesInput = z.infer<typeof listAddressesSchema>;
