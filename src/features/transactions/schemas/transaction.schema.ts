import { z } from "zod";

export const transactionTypeSchema = z.enum(["DEBIT", "CREDIT", "TRANSFER"]);

export const createTransactionSchema = z.object({
  date: z.coerce.date(),
  amount: z.number(),
  description: z.string().min(1, "Description is required"),
  type: transactionTypeSchema,
  categoryId: z.string().optional(),
  financialAccountId: z.string().min(1, "Account is required"),
  notes: z.string().optional(),
});

export const updateTransactionSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
  date: z.coerce.date().optional(),
  amount: z.number().optional(),
  description: z.string().min(1, "Description is required").optional(),
  type: transactionTypeSchema.optional(),
  categoryId: z.string().optional().nullable(),
  financialAccountId: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export const deleteTransactionSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
});

export const getTransactionsSchema = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  type: transactionTypeSchema.optional(),
  isTransfer: z.boolean().optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
});

export const importTransactionsSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  transactions: z.array(
    z.object({
      date: z.coerce.date(),
      amount: z.number(),
      description: z.string(),
      externalId: z.string().optional(),
    }),
  ),
});

export const detectTransfersSchema = z.object({
  accountId: z.string().optional(),
});

export const bulkUpdateTransactionsSchema = z.object({
  transactionIds: z.array(z.string().min(1)).optional(),
  // Filter criteria for "select all" mode
  filters: z
    .object({
      accountId: z.string().optional(),
      categoryId: z.string().optional(),
      type: transactionTypeSchema.optional(),
      isTransfer: z.boolean().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    })
    .optional(),
  categoryId: z.string().optional().nullable(),
  // Add more fields as needed for bulk updates
});

export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;
export type GetTransactionsInput = z.infer<typeof getTransactionsSchema>;
export type ImportTransactionsInput = z.infer<typeof importTransactionsSchema>;
export type DetectTransfersInput = z.infer<typeof detectTransfersSchema>;
export type BulkUpdateTransactionsInput = z.infer<typeof bulkUpdateTransactionsSchema>;

