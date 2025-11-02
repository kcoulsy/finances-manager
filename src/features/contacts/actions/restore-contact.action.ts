"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { getContactSchema } from "../schemas/contact.schema";

export const restoreContactAction = actionClient
  .inputSchema(getContactSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // Check if contact exists, belongs to user, and is archived
      const existingContact = await db.contact.findFirst({
        where: {
          id: parsedInput.contactId,
          userId: session.user.id,
          deletedAt: { not: null }, // Only restore archived contacts
        },
      });

      if (!existingContact) {
        throw new Error("Contact not found or not archived");
      }

      // Restore by clearing deletedAt
      await db.contact.update({
        where: {
          id: parsedInput.contactId,
        },
        data: {
          deletedAt: null,
        },
      });

      revalidatePath("/contacts");
      revalidatePath(`/contacts/${parsedInput.contactId}`);

      return {
        success: true,
        contact: {
          ...existingContact,
          deletedAt: null,
        },
        toast: {
          message: "Contact restored successfully",
          type: "success",
          description: `${existingContact.firstName} ${existingContact.lastName} has been restored.`,
        },
      };
    } catch (error) {
      console.error("Restore contact error:", error);

      let errorMessage = "Failed to restore contact";
      if (error instanceof Error) {
        const errorStr = error.message;
        if (errorStr.includes("not found")) {
          errorMessage = "Contact not found or not archived";
        } else if (errorStr.includes("Unauthorized")) {
          errorMessage = "You need to be logged in to restore contacts.";
        } else if (
          !errorStr.includes("Prisma") &&
          !errorStr.includes("TURBOPACK")
        ) {
          errorMessage = errorStr;
        }
      }

      throw new Error(errorMessage);
    }
  });

