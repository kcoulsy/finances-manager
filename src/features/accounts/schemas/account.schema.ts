import { z } from "zod";

export const accountTypeSchema = z.enum([
  "CHECKING",
  "SAVINGS",
  "CREDIT",
  "INVESTMENT",
  "OTHER",
]);

export const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: accountTypeSchema,
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  balance: z.number().default(0),
  currency: z.string().default("USD"),
  isActive: z.boolean().default(true),
});

export const updateAccountSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  name: z.string().min(1, "Account name is required").optional(),
  type: accountTypeSchema.optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const deleteAccountSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
});

export const getAccountSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
});

export type AccountType = z.infer<typeof accountTypeSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type GetAccountInput = z.infer<typeof getAccountSchema>;

