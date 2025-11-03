"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { getContactSchema } from "../schemas/contact.schema";

export const archiveContactAction = actionClient
  .inputSchema(getContactSchema)
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
          deletedAt: null, // Only archive non-archived contacts
        },
      });

      if (!existingContact) {
        throw new Error("Contact not found or already archived");
      }

      // Archive by setting deletedAt timestamp
      await db.contact.update({
        where: {
          id: parsedInput.contactId,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      revalidatePath("/contacts");
      revalidatePath(`/contacts/${parsedInput.contactId}`);

      return {
        success: true,
        contact: {
          ...existingContact,
          deletedAt: new Date(),
        },
        toast: {
          message: "Contact archived successfully",
          type: "success",
          description: `${existingContact.firstName} ${existingContact.lastName} has been archived.`,
        },
      };
    } catch (error) {
      console.error("Archive contact error:", error);

      let errorMessage = "Failed to archive contact";
      if (error instanceof Error) {
        const errorStr = error.message;
        if (errorStr.includes("not found")) {
          errorMessage = "Contact not found or already archived";
        } else if (errorStr.includes("Unauthorized")) {
          errorMessage = "You need to be logged in to archive contacts.";
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
