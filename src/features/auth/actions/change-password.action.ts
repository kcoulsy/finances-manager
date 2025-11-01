"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { changePasswordSchema } from "../schemas/auth.schema";
import { headers } from "next/headers";

export const changePasswordAction = actionClient
  .inputSchema(changePasswordSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session) {
        throw new Error("Unauthorized");
      }

      // Use changePassword API which handles verification and updating
      await auth.api.changePassword({
        body: {
          currentPassword: parsedInput.currentPassword,
          newPassword: parsedInput.newPassword,
          revokeOtherSessions: false,
        },
        headers: await headers(),
      });

      return {
        success: true,
        message: "Password changed successfully",
        toast: {
          message: "Password changed successfully",
          type: "success",
          description: "Your password has been updated.",
        },
      };
    } catch (error) {
      console.error("Change password error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to change password",
      );
    }
  });
