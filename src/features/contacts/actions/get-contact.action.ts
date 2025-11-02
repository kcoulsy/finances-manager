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
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch contact",
      );
    }
  });

