"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { getNotificationsSchema } from "../schemas/notification.schema";

export const getNotificationsAction = actionClient
  .inputSchema(getNotificationsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      const notifications = await db.notification.findMany({
        where: {
          userId: session.user.id,
          ...(parsedInput.unreadOnly ? { read: false } : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
        take: parsedInput.limit,
        skip: parsedInput.offset,
      });

      const unreadCount = await db.notification.count({
        where: {
          userId: session.user.id,
          read: false,
        },
      });

      return {
        success: true,
        notifications,
        unreadCount,
      };
    } catch (error) {
      console.error("Get notifications error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch notifications",
      );
    }
  });
