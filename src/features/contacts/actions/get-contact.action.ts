"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { getContactSchema } from "../schemas/contact.schema";
import { headers } from "next/headers";

export const getContactAction = actionClient
  .inputSchema(getContactSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      const contact = await db.contact.findFirst({
        where: {
          id: parsedInput.contactId,
          userId: session.user.id,
          deletedAt: null,
        },
      });

      if (!contact) {
        throw new Error("Contact not found");
      }

      return {
        success: true,
        contact,
      };
    } catch (error) {
      console.error("Get contact error:", error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to fetch contact";
      
      if (error instanceof Error) {
        const errorStr = error.message;
        
        // Handle authentication errors
        if (errorStr.includes("Unauthorized")) {
          errorMessage = "You need to be logged in to view contacts.";
        }
        // Handle not found errors
        else if (errorStr.includes("not found") || errorStr.includes("Not found")) {
          errorMessage = "Contact not found.";
        }
        // Use the error message if it's already user-friendly
        else if (!errorStr.includes("Prisma") && !errorStr.includes("TURBOPACK") && !errorStr.includes("Connection timeout")) {
          errorMessage = errorStr;
        }
      }
      
      throw new Error(errorMessage);
    }
  });

