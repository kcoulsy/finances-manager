"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { cancelInvitationSchema } from "../schemas/project-user.schema";

export const cancelInvitationAction = actionClient
  .inputSchema(cancelInvitationSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be logged in to cancel invitations.");
      }

      // Find invitation
      const invitation = await db.projectInvitation.findUnique({
        where: { id: parsedInput.invitationId },
        include: {
          project: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new Error("Invitation not found.");
      }

      // Check if user owns the project
      if (invitation.project.userId !== session.user.id) {
        throw new Error("You don't have permission to cancel this invitation.");
      }

      // Check if invitation is still pending
      if (invitation.status !== "PENDING") {
        throw new Error(
          "This invitation has already been accepted or cancelled.",
        );
      }

      // Cancel invitation
      await db.projectInvitation.update({
        where: { id: parsedInput.invitationId },
        data: {
          status: "CANCELLED",
        },
      });

      revalidatePath(`/projects/${invitation.projectId}/users`);

      return {
        success: true,
        toast: {
          message: "Invitation cancelled",
          type: "success",
          description: "The invitation has been cancelled.",
        },
      };
    } catch (error) {
      console.error("Cancel invitation error:", error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to cancel invitation. Please try again.");
    }
  });
