"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { getNotificationsSchema } from "../schemas/notification.schema";
import { headers } from "next/headers";

export const getNotificationsAction = actionClient
  .inputSchema(getNotificationsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

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
