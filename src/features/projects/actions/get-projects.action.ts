"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { headers } from "next/headers";

export const getProjectsAction = actionClient.action(async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const projects = await db.project.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return {
      success: true,
      projects,
    };
  } catch (error) {
    console.error("Get projects error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to fetch projects"
    );
  }
});

