"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { createAccountSchema } from "../schemas/account.schema";

export const createAccountAction = actionClient
  .inputSchema(createAccountSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to create an account.");
      }

      const account = await db.financialAccount.create({
        data: {
          name: parsedInput.name,
          type: parsedInput.type,
          bankName: parsedInput.bankName,
          accountNumber: parsedInput.accountNumber,
          balance: parsedInput.balance,
          currency: parsedInput.currency,
          isActive: parsedInput.isActive,
          userId: session.user.id,
        },
      });

      return {
        success: true,
        account,
        toast: {
          message: "Account created successfully",
          type: "success",
          description: `Account "${account.name}" has been created`,
        },
      };
    } catch (error) {
      console.error("Create account error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to create account. Please try again.",
      );
    }
  });

