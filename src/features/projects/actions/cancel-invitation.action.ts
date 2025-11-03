"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { db } from "@/features/shared/lib/db/client";
import { ProjectPermission } from "../constants/project-permissions";
import { requireProjectPermission } from "../lib/require-project-permission";
import { cancelInvitationSchema } from "../schemas/project-user.schema";

export const cancelInvitationAction = actionClient
  .inputSchema(cancelInvitationSchema)
  .action(async ({ parsedInput }) => {
    try {
      // Find invitation first to get project ID
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

      // Check permission before canceling
      await requireProjectPermission(
        invitation.projectId,
        ProjectPermission.Users.CANCEL_INVITATION,
      );

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
