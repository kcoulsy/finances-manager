"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { deleteContactSchema } from "../schemas/contact.schema";

/**
 * Checks if an error is a Next.js redirect or notFound error
 * These errors should be re-thrown as-is, not wrapped
 */
function isNextJsNavigationError(error: unknown): boolean {
  if (error && typeof error === "object" && "digest" in error) {
    const digest = String(error.digest);
    return (
      digest.includes("NEXT_REDIRECT") || digest.includes("NEXT_NOT_FOUND")
    );
  }
  return false;
}

export const deleteContactAction = actionClient
  .inputSchema(deleteContactSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // Check if contact exists and belongs to user
      const existingContact = await db.contact.findFirst({
        where: {
          id: parsedInput.contactId,
          userId: session.user.id,
        },
      });

      if (!existingContact) {
        throw new Error("Contact not found");
      }

      // Permanently delete the contact
      await db.contact.delete({
        where: {
          id: parsedInput.contactId,
        },
      });

      revalidatePath("/contacts");
      revalidatePath(`/contacts/${parsedInput.contactId}`);

      return {
        success: true,
        message: "Contact deleted successfully",
        toast: {
          message: "Contact deleted successfully",
          type: "success",
          description: `${existingContact.firstName} ${existingContact.lastName} has been deleted.`,
        },
      };
    } catch (error) {
      // Re-throw Next.js navigation errors (redirect/notFound) as-is
      if (isNextJsNavigationError(error)) {
        throw error;
      }

      console.error("Delete contact error:", error);

      // Provide user-friendly error messages
      let errorMessage = "Failed to delete contact";

      if (error instanceof Error) {
        const errorStr = error.message;

        // Handle authentication errors
        if (errorStr.includes("Unauthorized")) {
          errorMessage = "You need to be logged in to delete contacts.";
        }
        // Handle not found errors
        else if (
          errorStr.includes("not found") ||
          errorStr.includes("Not found") ||
          errorStr.includes("P2025")
        ) {
          errorMessage = "Contact not found.";
        }
        // Use the error message if it's already user-friendly
        else if (
          !errorStr.includes("Prisma") &&
          !errorStr.includes("TURBOPACK") &&
          !errorStr.includes("P2025")
        ) {
          errorMessage = errorStr;
        }
      }

      throw new Error(errorMessage);
    }
  });
