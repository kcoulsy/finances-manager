"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { markNotificationReadSchema } from "../schemas/notification.schema";
import { headers } from "next/headers";

export const markNotificationReadAction = actionClient
  .inputSchema(markNotificationReadSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      const notification = await db.notification.findUnique({
        where: {
          id: parsedInput.notificationId,
        },
      });

      if (!notification) {
        throw new Error("Notification not found");
      }

      if (notification.userId !== session.user.id) {
        throw new Error("Unauthorized");
      }

      const updatedNotification = await db.notification.update({
        where: {
          id: parsedInput.notificationId,
        },
        data: {
          read: true,
        },
      });

      return {
        success: true,
        notification: updatedNotification,
      };
    } catch (error) {
      console.error("Mark notification read error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to mark notification as read",
      );
    }
  });
