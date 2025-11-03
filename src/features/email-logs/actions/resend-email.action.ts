"use server";

import { UserRole } from "@/features/auth/constants/roles";
import { requireRole } from "@/features/auth/lib/require-role";
import { actionClient } from "@/features/shared/lib/actions/client";
import { db } from "@/features/shared/lib/db/client";
import { logEmail } from "@/features/shared/lib/utils/email/log-email";
import { resendEmailSchema } from "../schemas/email-log.schema";

/**
 * Resend an email from an email log
 * Requires ADMIN role
 */
export const resendEmailAction = actionClient
  .inputSchema(resendEmailSchema)
  .action(async ({ parsedInput }) => {
    await requireRole(UserRole.ADMIN);

    try {
      const { emailLogId } = parsedInput;

      // Get the original email log
      const originalEmailLog = await db.emailLog.findUnique({
        where: { id: emailLogId },
        include: {
          recipientUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          senderUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!originalEmailLog) {
        throw new Error("Email log not found.");
      }

      // Resend the email using logEmail
      const result = await logEmail({
        to: originalEmailLog.recipientEmail,
        subject: originalEmailLog.subject,
        html: originalEmailLog.content,
        from: originalEmailLog.senderEmail,
        recipientUserId: originalEmailLog.recipientUserId || undefined,
        senderUserId: originalEmailLog.senderUserId || undefined,
        recipientDisplayName:
          originalEmailLog.recipientDisplayName || undefined,
        senderDisplayName: originalEmailLog.senderDisplayName || undefined,
        mailType: originalEmailLog.mailType || undefined,
        mailClass: originalEmailLog.mailClass || undefined,
        isResend: true,
        originalEmailLogId: originalEmailLog.id,
      });

      // Email log was created even if sending failed
      // Return success if email log was created, even if sending failed
      if (!result.emailLogId) {
        throw new Error("Failed to create email log entry.");
      }

      if (!result.success) {
        // Email sending failed, but log was created
        return {
          success: true,
          emailLogId: result.emailLogId,
          toast: {
            message: "Email resend logged",
            type: "warning",
            description: `Email resend was logged but sending failed: ${result.error || "Email sending not configured"}`,
          },
        };
      }

      return {
        success: true,
        emailLogId: result.emailLogId,
        toast: {
          message: "Email resent successfully",
          type: "success",
          description: `Email has been resent to ${originalEmailLog.recipientEmail}`,
        },
      };
    } catch (error) {
      console.error("Error resending email:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to resend email",
      );
    }
  });
