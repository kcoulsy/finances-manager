import { logger } from "@/features/shared/lib/logger";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string;
    path?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const isDev = process.env.NODE_ENV === "development";

/**
 * Send an email
 * In development mode, logs the email details to console and file
 * In production, sends via configured email service
 *
 * @param options - Email options
 * @returns Promise with email result
 *
 * @example
 * ```ts
 * await sendEmail({
 *   to: "user@example.com",
 *   subject: "Welcome!",
 *   html: "<h1>Welcome</h1>",
 *   text: "Welcome"
 * });
 * ```
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<EmailResult> {
  if (isDev) {
    // In dev mode, just log the email details
    logger.info(
      {
        email: {
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          from: options.from || process.env.FROM_EMAIL || "noreply@example.com",
          replyTo: options.replyTo,
          cc: options.cc,
          bcc: options.bcc,
          hasHtml: !!options.html,
          hasText: !!options.text,
          htmlPreview: options.html
            ? options.html.substring(0, 200) +
              (options.html.length > 200 ? "..." : "")
            : undefined,
          textPreview: options.text
            ? options.text.substring(0, 200) +
              (options.text.length > 200 ? "..." : "")
            : undefined,
          attachments: options.attachments?.map((att) => ({
            filename: att.filename,
            hasContent: !!att.content,
            hasPath: !!att.path,
          })),
        },
      },
      "📧 Email would be sent (dev mode)",
    );

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    };
  }

  // In production, use actual email service
  // TODO: Implement actual email sending (Resend, SendGrid, etc.)
  try {
    // Example: Resend implementation
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // const result = await resend.emails.send({
    //   from: options.from || process.env.FROM_EMAIL || "noreply@example.com",
    //   to: Array.isArray(options.to) ? options.to : [options.to],
    //   subject: options.subject,
    //   html: options.html,
    //   text: options.text,
    //   reply_to: options.replyTo,
    //   cc: Array.isArray(options.cc) ? options.cc : options.cc ? [options.cc] : undefined,
    //   bcc: Array.isArray(options.bcc) ? options.bcc : options.bcc ? [options.bcc] : undefined,
    // });

    // For now, throw error to indicate not implemented
    throw new Error(
      "Email sending not configured. Set up your email service provider.",
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        email: {
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
        },
      },
      "Failed to send email",
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
