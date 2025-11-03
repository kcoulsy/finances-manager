"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { bulkArchiveContactsSchema } from "../schemas/contact.schema";

function isNextJsNavigationError(error: unknown): boolean {
  if (error && typeof error === "object" && "digest" in error) {
    const digest = String(error.digest);
    return (
      digest.includes("NEXT_REDIRECT") || digest.includes("NEXT_NOT_FOUND")
    );
  }
  return false;
}

export const bulkArchiveContactsAction = actionClient
  .inputSchema(bulkArchiveContactsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // Verify all contacts belong to the user and are not already archived
      const contacts = await db.contact.findMany({
        where: {
          id: { in: parsedInput.contactIds },
          userId: session.user.id,
          deletedAt: null, // Only archive non-archived contacts
        },
      });

      if (contacts.length === 0) {
        throw new Error("No contacts found to archive");
      }

      // Archive contacts by setting deletedAt timestamp
      await db.contact.updateMany({
        where: {
          id: { in: contacts.map((c) => c.id) },
        },
        data: {
          deletedAt: new Date(),
        },
      });

      revalidatePath("/contacts");

      return {
        success: true,
        message: "Contacts archived successfully",
        count: contacts.length,
        toast: {
          message: "Contacts archived",
          type: "success",
          description: `${contacts.length} ${contacts.length === 1 ? "contact has" : "contacts have"} been moved to your archive.`,
        },
      };
    } catch (error) {
      if (isNextJsNavigationError(error)) {
        throw error;
      }

      console.error("Bulk archive contacts error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to archive contacts",
      );
    }
  });
