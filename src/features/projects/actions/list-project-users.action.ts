"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { ProjectPermission } from "../constants/project-permissions";
import { requireProjectPermission } from "../lib/require-project-permission";
import { listProjectUsersSchema } from "../schemas/project-user.schema";

export const listProjectUsersAction = actionClient
  .inputSchema(listProjectUsersSchema)
  .action(async ({ parsedInput }) => {
    try {
      // Check permission before listing
      await requireProjectPermission(
        parsedInput.projectId,
        ProjectPermission.Users.VIEW,
      );

      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be logged in to view project users.");
      }

      // Verify project exists
      const project = await db.project.findUnique({
        where: { id: parsedInput.projectId },
      });

      if (!project) {
        throw new Error("Project not found.");
      }

      const limit = parsedInput.limit;
      const offset = (parsedInput.page - 1) * limit;

      const [projectUsers, invitations, totalUsers, totalInvitations] =
        await Promise.all([
          db.projectUser.findMany({
            where: { projectId: parsedInput.projectId },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          db.projectInvitation.findMany({
            where: {
              projectId: parsedInput.projectId,
              status: "PENDING",
              expiresAt: {
                gt: new Date(),
              },
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          }),
          db.projectUser.count({
            where: { projectId: parsedInput.projectId },
          }),
          db.projectInvitation.count({
            where: {
              projectId: parsedInput.projectId,
              status: "PENDING",
              expiresAt: {
                gt: new Date(),
              },
            },
          }),
        ]);

      // Combine and sort by creation date
      const allEntries = [
        ...projectUsers.map((pu) => ({
          type: "user" as const,
          id: pu.id,
          user: pu.user,
          userType: pu.userType,
          createdAt: pu.createdAt,
          email: pu.user.email,
        })),
        ...invitations.map((inv) => ({
          type: "invitation" as const,
          id: inv.id,
          user: inv.user
            ? {
                id: inv.user.id,
                name: inv.user.name,
                email: inv.user.email,
                image: inv.user.image,
              }
            : null,
          userType: inv.userType,
          createdAt: inv.createdAt,
          email: inv.email,
          invitation: {
            id: inv.id,
            status: inv.status,
            expiresAt: inv.expiresAt,
          },
        })),
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Get all unique emails from entries
      const emails = allEntries
        .map((entry) => entry.email?.trim().toLowerCase())
        .filter((email): email is string => !!email);

      // Fetch contacts that match these emails (including archived)
      const matchingContacts =
        emails.length > 0
          ? await db.contact.findMany({
              where: {
                userId: session.user.id,
                email: {
                  in: emails,
                },
              },
              select: {
                id: true,
                email: true,
              },
            })
          : [];

      // Create a map of email -> contactId for quick lookup
      const emailToContactMap: Record<string, string> = {};
      matchingContacts.forEach((contact) => {
        if (contact.email) {
          const normalizedEmail = contact.email.trim().toLowerCase();
          emailToContactMap[normalizedEmail] = contact.id;
        }
      });

      const total = totalUsers + totalInvitations;
      const paginatedEntries = allEntries.slice(offset, offset + limit);

      return {
        success: true,
        entries: paginatedEntries,
        total,
        page: parsedInput.page,
        limit,
        totalPages: Math.ceil(total / limit),
        emailToContactMap, // Map of normalized email -> contactId
      };
    } catch (error) {
      console.error("List project users error:", error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to fetch project users. Please try again.");
    }
  });
