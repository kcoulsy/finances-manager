"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { markAllNotificationsReadSchema } from "../schemas/notification.schema";
import { headers } from "next/headers";

export const markAllNotificationsReadAction = actionClient
  .inputSchema(markAllNotificationsReadSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

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
      };
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to mark all notifications as read"
      );
    }
  });

