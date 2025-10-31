"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { deleteAllNotificationsSchema } from "../schemas/notification.schema";
import { headers } from "next/headers";

export const deleteAllNotificationsAction = actionClient
  .inputSchema(deleteAllNotificationsSchema)
  .action(async () => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // Delete all notifications for the user
      await db.notification.deleteMany({
        where: {
          userId: session.user.id,
        },
      });

      return {
        success: true,
        toast: {
          message: "All notifications deleted",
          type: "success",
          description: "All notifications have been permanently deleted.",
        },
      };
    } catch (error) {
      console.error("Delete all notifications error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to delete all notifications"
      );
    }
  });
