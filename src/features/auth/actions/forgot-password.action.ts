"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { forgotPasswordSchema } from "../schemas/auth.schema";
// TODO: Implement email utility
// import { sendPasswordResetEmail } from "@/features/shared/lib/utils/email";
import { headers } from "next/headers";

export const forgotPasswordAction = actionClient
  .inputSchema(forgotPasswordSchema)
  .action(async ({ parsedInput }) => {
    try {
      // Request password reset from better-auth
      await auth.api.requestPasswordReset({
        body: {
          email: parsedInput.email,
          redirectTo: `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/reset-password`,
        },
        headers: await headers(),
      });

      // Generate reset URL (better-auth handles the token generation internally)
      // In a real scenario, better-auth will send the email via configured email service
      // TODO: Implement email sending utility
      // const resetUrl = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/reset-password`;
      // await sendPasswordResetEmail(parsedInput.email, resetUrl);

      return {
        success: true,
        message: "Password reset email sent",
      };
    } catch (error) {
      // Better Auth doesn't reveal if email exists, so we always return success
      // to prevent email enumeration attacks
      return {
        success: true,
        message: "If an account exists, a password reset email has been sent",
      };
    }
  });

