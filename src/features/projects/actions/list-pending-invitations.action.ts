"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { listPendingInvitationsSchema } from "../schemas/project-user.schema";

export const listPendingInvitationsAction = actionClient
  .inputSchema(listPendingInvitationsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be logged in to view invitations.");
      }

      const limit = parsedInput.limit;
      const offset = (parsedInput.page - 1) * limit;

      const [invitations, total] = await Promise.all([
        db.projectInvitation.findMany({
          where: {
            email: session.user.email,
            status: "PENDING",
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
            invitedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        db.projectInvitation.count({
          where: {
            email: session.user.email,
            status: "PENDING",
            expiresAt: {
              gt: new Date(),
            },
          },
        }),
      ]);

      return {
        success: true,
        invitations,
        total,
        page: parsedInput.page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error("List pending invitations error:", error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to fetch invitations. Please try again.");
    }
  });
