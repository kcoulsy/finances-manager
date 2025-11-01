"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { createNotificationSchema } from "../schemas/notification.schema";
import { headers } from "next/headers";

export const createNotificationAction = actionClient
  .inputSchema(createNotificationSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // Only allow users to create notifications for themselves unless they're admin
      // For now, allow users to create notifications for themselves
      if (parsedInput.userId !== session.user.id) {
        throw new Error("You can only create notifications for yourself");
      }

      const notification = await db.notification.create({
        data: {
          userId: parsedInput.userId,
          title: parsedInput.title,
          subtitle: parsedInput.subtitle || null,
          detail: parsedInput.detail || null,
          link: parsedInput.link || null,
          read: false,
        },
      });

      return {
        success: true,
        notification,
      };
    } catch (error) {
      console.error("Create notification error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to create notification",
      );
    }
  });
