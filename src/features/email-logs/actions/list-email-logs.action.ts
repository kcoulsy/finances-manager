"use server";

import { UserRole } from "@/features/auth/constants/roles";
import { requireRole } from "@/features/auth/lib/require-role";
import { actionClient } from "@/features/shared/lib/actions/client";
import { db } from "@/features/shared/lib/db/client";
import { listEmailLogsSchema } from "../schemas/email-log.schema";

/**
 * List email logs with filtering and pagination
 * Requires ADMIN role
 */
export const listEmailLogsAction = actionClient
  .inputSchema(listEmailLogsSchema)
  .action(async ({ parsedInput }) => {
    await requireRole(UserRole.ADMIN);

    try {
      const {
        search,
        status,
        mailType,
        readStatus,
        dateFrom,
        dateTo,
        sortBy = "sentAt",
        sortDirection = "desc",
        cursor,
        limit = 20,
      } = parsedInput;

      // Build where clause
      const where: {
        OR?: Array<{
          subject?: { contains: string };
          recipientEmail?: { contains: string };
          senderEmail?: { contains: string };
          content?: { contains: string };
          recipientUser?: {
            OR?: Array<{
              name?: { contains: string };
              email?: { contains: string };
            }>;
          };
          senderUser?: {
            OR?: Array<{
              name?: { contains: string };
              email?: { contains: string };
            }>;
          };
        }>;
        status?: string;
        mailType?: string;
        sentAt?: { gte?: Date; lte?: Date; lt?: Date; gt?: Date };
      } = {};

      // Search filter
      if (search?.trim()) {
        where.OR = [
          { subject: { contains: search } },
          { recipientEmail: { contains: search } },
          { senderEmail: { contains: search } },
          { content: { contains: search } },
          {
            recipientUser: {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
              ],
            },
          },
          {
            senderUser: {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
              ],
            },
          },
        ];
      }

      // Status filter
      if (status) {
        where.status = status;
      }

      // Mail type filter
      if (mailType) {
        where.mailType = mailType;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        where.sentAt = {};
        if (dateFrom) {
          where.sentAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.sentAt.lte = new Date(dateTo);
        }
      }

      // Build orderBy
      let orderBy: Record<string, "asc" | "desc"> = { sentAt: "desc" };
      if (sortBy === "sentAt") {
        orderBy = { sentAt: sortDirection };
      } else if (sortBy === "subject") {
        orderBy = { subject: sortDirection };
      } else if (sortBy === "recipientEmail") {
        orderBy = { recipientEmail: sortDirection };
      } else if (sortBy === "status") {
        orderBy = { status: sortDirection };
      }

      // Cursor-based pagination
      if (cursor) {
        // Decode cursor (simple base64 for sentAt timestamp)
        const cursorDate = new Date(cursor);
        if (!Number.isNaN(cursorDate.getTime())) {
          if (sortDirection === "desc") {
            where.sentAt = where.sentAt
              ? { ...where.sentAt, lt: cursorDate }
              : { lt: cursorDate };
          } else {
            where.sentAt = where.sentAt
              ? { ...where.sentAt, gt: cursorDate }
              : { gt: cursorDate };
          }
        }
      }

      // Read status filter
      const hasReadsFilter = readStatus === "read";
      const hasNoReadsFilter = readStatus === "unread";

      // Get email logs
      let emailLogs: Awaited<ReturnType<typeof db.emailLog.findMany>>;
      if (hasReadsFilter) {
        emailLogs = await db.emailLog.findMany({
          where: {
            ...where,
            reads: { some: {} },
          },
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
              take: 5,
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
                sentAt: true,
              },
              orderBy: { sentAt: "desc" },
            },
          },
          orderBy,
          take: limit + 1, // Fetch one extra to check if there's more
        });
      } else if (hasNoReadsFilter) {
        emailLogs = await db.emailLog.findMany({
          where: {
            ...where,
            reads: { none: {} },
          },
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
              take: 5,
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
                sentAt: true,
              },
              orderBy: { sentAt: "desc" },
            },
          },
          orderBy,
          take: limit + 1, // Fetch one extra to check if there's more
        });
      } else {
        emailLogs = await db.emailLog.findMany({
          where,
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
              take: 5,
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
                sentAt: true,
              },
              orderBy: { sentAt: "desc" },
            },
          },
          orderBy,
          take: limit + 1, // Fetch one extra to check if there's more
        });
      }

      // Check if there are more pages
      const hasMore = emailLogs.length > limit;
      const logs = hasMore ? emailLogs.slice(0, limit) : emailLogs;

      // Get next cursor
      let nextCursor: string | undefined;
      if (hasMore && logs.length > 0) {
        const lastLog = logs[logs.length - 1];
        nextCursor = lastLog.sentAt.toISOString();
      }

      // Get total count for display
      const totalCount = await db.emailLog.count({ where });

      return {
        success: true,
        emailLogs: logs.map((log) => ({
          id: log.id,
          recipientEmail: log.recipientEmail,
          recipientUserId: log.recipientUserId,
          recipientDisplayName:
            log.recipientDisplayName ||
            log.recipientUser?.name ||
            log.recipientEmail,
          senderEmail: log.senderEmail,
          senderUserId: log.senderUserId,
          senderDisplayName:
            log.senderDisplayName || log.senderUser?.name || log.senderEmail,
          subject: log.subject,
          content: log.content,
          status: log.status,
          mailType: log.mailType,
          mailClass: log.mailClass,
          isResend: log.isResend,
          originalEmailLogId: log.originalEmailLogId,
          errorMessage: log.errorMessage,
          sentAt: log.sentAt.toISOString(),
          deliveredAt: log.deliveredAt?.toISOString() || null,
          readCount: log.reads.length,
          isRead: log.reads.length > 0,
          originalEmailLog: log.originalEmailLog,
          resendCount: log.resends.length,
        })),
        pagination: {
          hasMore,
          nextCursor,
          totalCount,
        },
      };
    } catch (error) {
      console.error("Error fetching email logs:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch email logs",
      );
    }
  });
