"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { bulkDeleteContactsSchema } from "../schemas/contact.schema";

function isNextJsNavigationError(error: unknown): boolean {
  if (error && typeof error === "object" && "digest" in error) {
    const digest = String(error.digest);
    return (
      digest.includes("NEXT_REDIRECT") || digest.includes("NEXT_NOT_FOUND")
    );
  }
  return false;
}

export const bulkDeleteContactsAction = actionClient
  .inputSchema(bulkDeleteContactsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // Verify all contacts belong to the user
      const contacts = await db.contact.findMany({
        where: {
          id: { in: parsedInput.contactIds },
          userId: session.user.id,
        },
      });

      if (contacts.length === 0) {
        throw new Error("No contacts found to delete");
      }

      // Permanently delete contacts
      await db.contact.deleteMany({
        where: {
          id: { in: contacts.map((c) => c.id) },
        },
      });

      revalidatePath("/contacts");

      return {
        success: true,
        message: "Contacts deleted successfully",
        count: contacts.length,
        toast: {
          message: "Contacts deleted permanently",
          type: "success",
          description: `${contacts.length} ${contacts.length === 1 ? "contact has" : "contacts have"} been permanently removed.`,
        },
      };
    } catch (error) {
      if (isNextJsNavigationError(error)) {
        throw error;
      }

      console.error("Bulk delete contacts error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete contacts",
      );
    }
  });

