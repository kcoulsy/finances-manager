"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { sendEmail } from "@/features/shared/lib/utils/email";
import { getBaseUrl } from "@/features/shared/lib/utils/get-base-url";
import { createProjectSchema } from "../schemas/project.schema";

export const createProjectAction = actionClient
  .inputSchema(createProjectSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // Create project data
      const projectData: {
        name: string;
        description: string | null;
        userId: string;
        primaryClientId?: string | null;
      } = {
        name: parsedInput.name,
        description: parsedInput.description || null,
        userId: session.user.id,
      };

      // Handle primary client if provided
      if (parsedInput.primaryClientId) {
        let primaryClientUser: { id: string; email: string } | null;

        // Check if it's an email lookup (format: "email:contact@example.com")
        if (parsedInput.primaryClientId.startsWith("email:")) {
          const email = parsedInput.primaryClientId.replace("email:", "");
          primaryClientUser = await db.user.findUnique({
            where: { email },
          });

          if (!primaryClientUser) {
            throw new Error(
              "Primary client not found. The selected contact must have a user account.",
            );
          }
        } else {
          // It's a direct user ID
          primaryClientUser = await db.user.findUnique({
            where: { id: parsedInput.primaryClientId },
          });

          if (!primaryClientUser) {
            throw new Error("Primary client user not found.");
          }
        }

        // If primary client is the current user, add directly to project
        if (primaryClientUser.id === session.user.id) {
          // Create project with primaryClientId set
          projectData.primaryClientId = primaryClientUser.id;

          const project = await db.project.create({
            data: projectData,
          });

          // Add user directly to project as Client
          await db.projectUser.create({
            data: {
              projectId: project.id,
              userId: session.user.id,
              userType: "Client",
            },
          });

          revalidatePath("/projects");
          revalidatePath(`/projects/${project.id}`);

          return {
            success: true,
            project,
            toast: {
              message: "Project created successfully",
              type: "success",
              description: `Project "${project.name}" has been created with you as the primary client.`,
            },
          };
        }

        // If primary client is different, set it and invite them
        projectData.primaryClientId = primaryClientUser.id;
      }

      // Create project
      const project = await db.project.create({
        data: projectData,
      });

      // If primary client was provided and is different user, invite them
      if (
        parsedInput.primaryClientId &&
        parsedInput.primaryClientId !== session.user.id
      ) {
        const primaryClientUser = await db.user.findUnique({
          where: { id: parsedInput.primaryClientId },
        });

        if (primaryClientUser) {
          // Check if user is already on the project
          const existingProjectUser = await db.projectUser.findUnique({
            where: {
              projectId_userId: {
                projectId: project.id,
                userId: primaryClientUser.id,
              },
            },
          });

          // Check if there's a pending invitation
          const existingInvitation = await db.projectInvitation.findFirst({
            where: {
              projectId: project.id,
              email: primaryClientUser.email,
              status: "PENDING",
            },
          });

          if (!existingProjectUser && !existingInvitation) {
            // Generate invitation token
            const token = randomBytes(32).toString("hex");
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

            // Create invitation
            await db.projectInvitation.create({
              data: {
                projectId: project.id,
                email: primaryClientUser.email,
                userId: primaryClientUser.id,
                userType: "Client",
                token,
                status: "PENDING",
                expiresAt,
                invitedById: session.user.id,
              },
            });

            // Prepare invitation details for email and notification
            const baseUrl = getBaseUrl();
            const invitationUrl = `${baseUrl}/invitations/accept?token=${token}`;

            const projectName = project.name;
            const inviterName = session.user.name || "Someone";

            // Send invitation email
            await sendEmail({
              to: primaryClientUser.email,
              subject: `You've been invited to join ${projectName}`,
              html: `
                <h1>Project Invitation</h1>
                <p>Hello,</p>
                <p><strong>${inviterName}</strong> has invited you to join the project <strong>${projectName}</strong> as a <strong>Client</strong> and set you as the primary client.</p>
                <p>Click the link below to accept the invitation:</p>
                <p><a href="${invitationUrl}">${invitationUrl}</a></p>
                <p>This invitation will expire in 7 days.</p>
              `,
              text: `
                Project Invitation
                
                Hello,
                
                ${inviterName} has invited you to join the project ${projectName} as a Client and set you as the primary client.
                
                Click the link below to accept the invitation:
                ${invitationUrl}
                
                This invitation will expire in 7 days.
              `,
            });

            // Create notification for the user
            await db.notification.create({
              data: {
                userId: primaryClientUser.id,
                title: `You've been invited to join ${projectName} as primary client`,
                subtitle: `${inviterName} has invited you as a Client`,
                detail: `## Project Invitation\n\nYou have been invited to join the project **${projectName}** as a **Client** and set as the primary client.\n\nClick to view and accept the invitation.`,
                link: `/invitations/accept?token=${token}`,
                read: false,
              },
            });

            revalidatePath(`/projects/${project.id}/users`);
            revalidatePath("/invitations/pending");
            revalidatePath("/notifications");
          }
        }
      }

      revalidatePath("/projects");
      revalidatePath(`/projects/${project.id}`);

      return {
        success: true,
        project,
        toast: {
          message: "Project created successfully",
          type: "success",
          description: parsedInput.primaryClientId
            ? `Project "${project.name}" has been created and primary client has been invited.`
            : `Project "${project.name}" has been created.`,
        },
      };
    } catch (error) {
      console.error("Create project error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to create project",
      );
    }
  });
