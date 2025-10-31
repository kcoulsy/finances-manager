"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { resetPasswordSchema } from "../schemas/auth.schema";
import { headers } from "next/headers";

export const resetPasswordAction = actionClient
  .inputSchema(resetPasswordSchema)
  .action(async ({ parsedInput }) => {
    const response = await auth.api.resetPassword({
      body: {
        token: parsedInput.token,
        newPassword: parsedInput.newPassword,
      },
      headers: await headers(),
    });

    if (!response) {
      throw new Error("Failed to reset password");
    }

    return {
      success: true,
      message: "Password reset successfully",
    };
  });

