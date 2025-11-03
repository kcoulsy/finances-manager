"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { markAllNotificationsReadSchema } from "../schemas/notification.schema";

export const markAllNotificationsReadAction = actionClient
  .inputSchema(markAllNotificationsReadSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      await db.notification.updateMany({
        where: {
          userId: session.user.id,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return {
        success: true,
        toast: {
          message: "All notifications marked as read",
          type: "success",
          description: "All notifications have been marked as read.",
        },
      };
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to mark all notifications as read",
      );
    }
  });
