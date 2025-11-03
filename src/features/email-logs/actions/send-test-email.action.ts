"use server";

import { UserRole } from "@/features/auth/constants/roles";
import { requireRole } from "@/features/auth/lib/require-role";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { logEmail } from "@/features/shared/lib/utils/email/log-email";
import { sendTestEmailSchema } from "../schemas/email-log.schema";

/**
 * Send a test email for email logging system
 * Requires ADMIN role
 */
export const sendTestEmailAction = actionClient
  .inputSchema(sendTestEmailSchema)
  .action(async () => {
    await requireRole(UserRole.ADMIN);

    try {
      const session = await getSession();
      if (!session?.user) {
        throw new Error("You must be signed in to send test emails.");
      }

      const testMessage = `Test email sent from admin dashboard at ${new Date().toLocaleString()} to verify email logging and tracking functionality.`;

      const result = await logEmail({
        to: session.user.email,
        subject: "Test Email - Email Logging System",
        html: `
          <h1>Test Email</h1>
          <p>This is a test email sent from the admin dashboard to verify email logging and tracking functionality.</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Purpose:</strong> Testing email logging system</p>
          <p>This email was logged in the database for tracking and auditing purposes.</p>
        `,
        text: testMessage,
        recipientUserId: session.user.id,
        recipientDisplayName: session.user.name || undefined,
        senderDisplayName: "System",
        mailType: "notification",
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
            message: "Test email logged",
            type: "warning",
            description: `Test email was logged but sending failed: ${result.error || "Email sending not configured"}`,
          },
        };
      }

      return {
        success: true,
        emailLogId: result.emailLogId,
        toast: {
          message: "Test email sent successfully",
          type: "success",
          description: `Test email has been sent to ${session.user.email}`,
        },
      };
    } catch (error) {
      console.error("Error sending test email:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to send test email",
      );
    }
  });
