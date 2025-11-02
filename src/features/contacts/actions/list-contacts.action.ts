"use server";

import { headers } from "next/headers";
import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { listContactsSchema } from "../schemas/contact.schema";

export const listContactsAction = actionClient
  .inputSchema(listContactsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      const limit = parsedInput.limit ?? 50;
      const offset = parsedInput.offset ?? 0;

      // Build where clause
      const where: any = {
        userId: session.user.id,
      };

      // Filter by archived status
      if (parsedInput.includeArchived === true) {
        // Show all contacts (archived and non-archived)
        // No filter needed
      } else {
        // Only show non-archived contacts (default behavior)
        where.deletedAt = null;
      }

      if (parsedInput.status) {
        where.status = parsedInput.status;
      }

      if (parsedInput.engagement) {
        where.engagement = parsedInput.engagement;
      }

      if (parsedInput.role) {
        where.role = parsedInput.role;
      }

      if (parsedInput.search) {
        // SQLite doesn't support mode: "insensitive", but LIKE is case-insensitive by default
        where.OR = [
          { firstName: { contains: parsedInput.search } },
          { lastName: { contains: parsedInput.search } },
          { email: { contains: parsedInput.search } },
        ];
      }

      // Build orderBy clause
      const sortBy = parsedInput.sortBy || "updatedAt";
      const sortOrder = parsedInput.sortOrder || "desc";
      
      // Map column names to Prisma fields
      const orderByField: Record<string, unknown> = {};
      if (sortBy === "name") {
        orderByField.firstName = sortOrder;
      } else if (sortBy === "email") {
        orderByField.email = sortOrder;
      } else if (sortBy === "status") {
        orderByField.status = sortOrder;
      } else if (sortBy === "updatedAt") {
        orderByField.updatedAt = sortOrder;
      } else {
        orderByField.updatedAt = "desc";
      }

      const [contacts, total] = await Promise.all([
        db.contact.findMany({
          where,
          orderBy: orderByField,
          take: limit,
          skip: offset,
        }),
        db.contact.count({
          where,
        }),
      ]);

      return {
        success: true,
        contacts,
        total,
        limit,
        offset,
      };
    } catch (error) {
      console.error("List contacts error:", error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to fetch contacts";
      
      if (error instanceof Error) {
        const errorStr = error.message;
        
        // Handle authentication errors
        if (errorStr.includes("Unauthorized")) {
          errorMessage = "You need to be logged in to view contacts.";
        }
        // Use the error message if it's already user-friendly
        else if (!errorStr.includes("Prisma") && !errorStr.includes("TURBOPACK") && !errorStr.includes("Connection timeout")) {
          errorMessage = errorStr;
        }
      }
      
      throw new Error(errorMessage);
    }
  });
