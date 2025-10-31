"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { deleteAccountSchema } from "../schemas/auth.schema";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const deleteAccountAction = actionClient
  .inputSchema(deleteAccountSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      throw new Error("Unauthorized");
    }

    await auth.api.deleteUser({
      body: {
        password: parsedInput.password,
      },
      headers: await headers(),
    });

    // Account deleted successfully - redirect to login
    // Note: We don't return a toast here since we redirect immediately
    redirect("/login");

    // This will never execute, but TypeScript needs a return
    return {
      success: true,
      message: "Account deleted successfully",
    };
  });
