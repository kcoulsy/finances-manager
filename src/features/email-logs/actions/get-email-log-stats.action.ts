"use server";

import { z } from "zod";
import { UserRole } from "@/features/auth/constants/roles";
import { requireRole } from "@/features/auth/lib/require-role";
import { actionClient } from "@/features/shared/lib/actions/client";
import { db } from "@/features/shared/lib/db/client";

/**
 * Get email log statistics
 * Requires ADMIN role
 */
export const getEmailLogStatsAction = actionClient
  .inputSchema(z.object({}))
  .action(async () => {
    await requireRole(UserRole.ADMIN);

    try {
      // Get total count
      const totalEmails = await db.emailLog.count();

      // Get counts by status
      const statusCounts = await db.emailLog.groupBy({
        by: ["status"],
        _count: {
          id: true,
        },
      });

      // Get counts by mail type
      const mailTypeCounts = await db.emailLog.groupBy({
        by: ["mailType"],
        _count: {
          id: true,
        },
        where: {
          mailType: {
            not: null,
          },
        },
      });

      // Get emails with reads
      const emailsWithReads = await db.emailLog.count({
        where: {
          reads: {
            some: {},
          },
        },
      });

      // Get today's emails
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const emailsToday = await db.emailLog.count({
        where: {
          sentAt: {
            gte: today,
          },
        },
      });

      // Get this week's emails
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      const emailsThisWeek = await db.emailLog.count({
        where: {
          sentAt: {
            gte: weekStart,
          },
        },
      });

      // Get this month's emails
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const emailsThisMonth = await db.emailLog.count({
        where: {
          sentAt: {
            gte: monthStart,
          },
        },
      });

      // Calculate read rate
      const readRate =
        totalEmails > 0 ? (emailsWithReads / totalEmails) * 100 : 0;

      return {
        success: true,
        stats: {
          totalEmails,
          emailsToday,
          emailsThisWeek,
          emailsThisMonth,
          readRate: Math.round(readRate * 10) / 10, // Round to 1 decimal place
          statusCounts: statusCounts.reduce(
            (acc, item) => {
              acc[item.status] = item._count.id;
              return acc;
            },
            {} as Record<string, number>,
          ),
          mailTypeCounts: mailTypeCounts.reduce(
            (acc, item) => {
              if (item.mailType) {
                acc[item.mailType] = item._count.id;
              }
              return acc;
            },
            {} as Record<string, number>,
          ),
        },
      };
    } catch (error) {
      console.error("Error fetching email log stats:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch email log statistics",
      );
    }
  });
