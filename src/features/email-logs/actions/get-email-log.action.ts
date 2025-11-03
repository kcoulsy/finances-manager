"use server";

import { UserRole } from "@/features/auth/constants/roles";
import { requireRole } from "@/features/auth/lib/require-role";
import { actionClient } from "@/features/shared/lib/actions/client";
import { db } from "@/features/shared/lib/db/client";
import { getEmailLogSchema } from "../schemas/email-log.schema";

/**
 * Get a single email log by ID
 * Requires ADMIN role
 */
export const getEmailLogAction = actionClient
  .inputSchema(getEmailLogSchema)
  .action(async ({ parsedInput }) => {
    await requireRole(UserRole.ADMIN);

    try {
      const { emailLogId } = parsedInput;

      const emailLog = await db.emailLog.findUnique({
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
          reads: {
            orderBy: { readAt: "desc" },
          },
          originalEmailLog: {
            select: {
              id: true,
              subject: true,
              sentAt: true,
            },
          },
          resends: {
            select: {
              id: true,
              subject: true,
              sentAt: true,
            },
            orderBy: { sentAt: "desc" },
          },
        },
      });

      if (!emailLog) {
        throw new Error("Email log not found.");
      }

      return {
        success: true,
        emailLog: {
          id: emailLog.id,
          recipientEmail: emailLog.recipientEmail,
          recipientUserId: emailLog.recipientUserId,
          recipientDisplayName:
            emailLog.recipientDisplayName ||
            emailLog.recipientUser?.name ||
            emailLog.recipientEmail,
          senderEmail: emailLog.senderEmail,
          senderUserId: emailLog.senderUserId,
          senderDisplayName:
            emailLog.senderDisplayName ||
            emailLog.senderUser?.name ||
            emailLog.senderEmail,
          subject: emailLog.subject,
          content: emailLog.content,
          status: emailLog.status,
          mailType: emailLog.mailType,
          mailClass: emailLog.mailClass,
          isResend: emailLog.isResend,
          originalEmailLogId: emailLog.originalEmailLogId,
          errorMessage: emailLog.errorMessage,
          sentAt: emailLog.sentAt.toISOString(),
          deliveredAt: emailLog.deliveredAt?.toISOString() || null,
          readCount: emailLog.reads.length,
          isRead: emailLog.reads.length > 0,
          reads: emailLog.reads.map((read) => ({
            id: read.id,
            readAt: read.readAt.toISOString(),
            ipAddress: read.ipAddress,
            browser: read.browser,
            operatingSystem: read.operatingSystem,
          })),
          originalEmailLog: emailLog.originalEmailLog,
          resends: emailLog.resends,
        },
      };
    } catch (error) {
      console.error("Error fetching email log:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch email log",
      );
    }
  });
