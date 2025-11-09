import { z } from "zod";

export const updateCurrencySchema = z.object({
  currency: z.string().min(1, "Currency is required"),
});

export type UpdateCurrencyInput = z.infer<typeof updateCurrencySchema>;

