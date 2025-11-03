"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { listAddressesSchema } from "../schemas/address.schema";

export const listAddressesAction = actionClient
  .inputSchema(listAddressesSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // Verify the addressable entity exists and belongs to the user
      if (parsedInput.addressableType === "Contact") {
        const contact = await db.contact.findFirst({
          where: {
            id: parsedInput.addressableId,
            userId: session.user.id,
            deletedAt: null,
          },
        });

        if (!contact) {
          throw new Error("Contact not found");
        }
      }
      // Future: Add Project verification here

      const addresses = await db.address.findMany({
        where: {
          addressableType: parsedInput.addressableType,
          addressableId: parsedInput.addressableId,
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      });

      return {
        success: true,
        addresses,
      };
    } catch (error) {
      console.error("List addresses error:", error);

      let errorMessage = "Failed to retrieve addresses";

      if (error instanceof Error) {
        const errorStr = error.message;

        if (errorStr.includes("Unauthorized")) {
          errorMessage = "You need to be logged in to view addresses.";
        } else if (
          errorStr.includes("not found") ||
          errorStr.includes("Not found")
        ) {
          errorMessage = "Contact not found.";
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
