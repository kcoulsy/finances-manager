"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const logoutAction = actionClient.action(async () => {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
  } catch (error) {
    console.error("Logout error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to sign out"
    );
  }

  redirect("/login");

  // This will never execute, but TypeScript needs a return
  return {
    success: true,
    message: "Signed out successfully",
  };
});
