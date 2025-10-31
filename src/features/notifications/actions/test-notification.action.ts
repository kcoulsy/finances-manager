"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

const testNotificationSchema = z.object({});

export const testNotificationAction = actionClient
  .inputSchema(testNotificationSchema)
  .action(async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Create a test notification
    await db.notification.create({
      data: {
        userId: session.user.id,
        title: "Test Notification",
        subtitle: "This is a test notification",
        detail: `## Test Notification Details\n\nThis is a **test notification** created at ${new Date().toLocaleString()}.\n\nYou can use markdown in the detail section:\n\n- Bullet points\n- **Bold text**\n- *Italic text*\n\n### Sample Code Block\n\n\`\`\`typescript\nconst test = "Hello World";\n\`\`\``,
        link: "/dashboard",
        read: false,
      },
    });

    // Revalidate the notifications page and dashboard
    revalidatePath("/notifications");
    revalidatePath("/dashboard");

    return {
      success: true,
      toast: {
        message: "Notification created successfully",
        type: "success",
        description:
          "A test notification has been added to your notifications.",
      },
    };
  });
