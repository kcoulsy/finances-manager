"use server";

import type { EmailLogStatus } from "@prisma/client";
import { db } from "@/features/shared/lib/db/client";
import { type SendEmailOptions, sendEmail } from "./index";

export interface LogEmailOptions extends SendEmailOptions {
  recipientUserId?: string;
  senderUserId?: string;
  recipientDisplayName?: string;
  senderDisplayName?: string;
  mailType?: string;
  mailClass?: string;
  isResend?: boolean;
  originalEmailLogId?: string;
}

/**
 * Send an email and log it to the database
 * Wraps sendEmail to automatically log all email activity
 *
 * @param options - Email options including logging metadata
 * @returns Promise with email result and log ID
 *
 * @example
 * ```ts
 * await logEmail({
 *   to: "user@example.com",
 *   subject: "Welcome!",
 *   html: "<h1>Welcome</h1>",
 *   recipientUserId: "user-id",
 *   mailType: "notification"
 * });
 * ```
 */
export async function logEmail(options: LogEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  emailLogId?: string;
}> {
  const {
    recipientUserId,
    senderUserId,
    recipientDisplayName,
    senderDisplayName,
    mailType,
    mailClass,
    isResend,
    originalEmailLogId,
    ...emailOptions
  } = options;

  const recipientEmail = Array.isArray(emailOptions.to)
    ? emailOptions.to[0]
    : emailOptions.to;

  const senderEmail =
    emailOptions.from || process.env.FROM_EMAIL || "noreply@example.com";

  // Find recipient user if email matches
  let resolvedRecipientUserId = recipientUserId;
  let resolvedRecipientDisplayName = recipientDisplayName;

  if (!resolvedRecipientUserId) {
    const recipientUser = await db.user.findUnique({
      where: { email: recipientEmail },
      select: { id: true, name: true },
    });
    if (recipientUser) {
      resolvedRecipientUserId = recipientUser.id;
      resolvedRecipientDisplayName =
        resolvedRecipientDisplayName || recipientUser.name;
    }
  }

  // Find sender user if email matches
  let resolvedSenderUserId = senderUserId;
  let resolvedSenderDisplayName = senderDisplayName;

  if (!resolvedSenderUserId) {
    const senderUser = await db.user.findUnique({
      where: { email: senderEmail },
      select: { id: true, name: true },
    });
    if (senderUser) {
      resolvedSenderUserId = senderUser.id;
      resolvedSenderDisplayName = resolvedSenderDisplayName || senderUser.name;
    }
  }

  // Create email log entry before sending
  let emailLog: { id: string } | null = null;
  try {
    emailLog = await db.emailLog.create({
      data: {
        recipientEmail,
        recipientUserId: resolvedRecipientUserId || null,
        recipientDisplayName: resolvedRecipientDisplayName || null,
        senderEmail,
        senderUserId: resolvedSenderUserId || null,
        senderDisplayName: resolvedSenderDisplayName || null,
        subject: emailOptions.subject,
        content: emailOptions.html || emailOptions.text || "",
        status: "SENT",
        mailType: mailType || null,
        mailClass: mailClass || null,
        isResend: isResend || false,
        originalEmailLogId: originalEmailLogId || null,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    // Log error but don't fail email sending
    console.error("Failed to create email log:", error);
  }

  // Inject tracking pixel into HTML content for sending only (not stored in database)
  let htmlContentWithPixel = emailOptions.html;
  if (htmlContentWithPixel && emailLog?.id) {
    // Get base URL from environment variables or use localhost
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "http://localhost:3000";
    const trackingPixelUrl = `${baseUrl}/api/email-logs/track/${emailLog.id}`;

    // Inject tracking pixel at the end of the body, or at the end of the HTML
    if (htmlContentWithPixel.includes("</body>")) {
      htmlContentWithPixel = htmlContentWithPixel.replace(
        "</body>",
        `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" /></body>`,
      );
    } else {
      // If no body tag, append at the end
      htmlContentWithPixel = `${htmlContentWithPixel}<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
    }
  }

  // Send the email with tracking pixel (pixel not stored in database)
  const result = await sendEmail({
    ...emailOptions,
    html: htmlContentWithPixel || emailOptions.html,
  });

  // Update email log with result and status (content remains without tracking pixel)
  if (emailLog) {
    let status: EmailLogStatus = "SENT";
    let errorMessage: string | null = null;

    if (result.success) {
      // In production, you might get delivery status from email service
      // For now, mark as delivered if successful
      status = "DELIVERED";
    } else {
      status = "FAILED";
      errorMessage = result.error || "Failed to send email";
    }

    // Update status only (content already stored without tracking pixel)
    await db.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status,
        ...(status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
        ...(errorMessage ? { errorMessage } : {}),
      },
    });
  }

  return {
    ...result,
    emailLogId: emailLog?.id,
  };
}
