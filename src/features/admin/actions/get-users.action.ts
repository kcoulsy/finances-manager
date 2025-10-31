"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { requirePermission } from "@/features/auth/lib/require-permission";
import { db } from "@/features/shared/lib/db/client";
import { Permission } from "@/features/auth/constants/permissions";
import { getUsersSchema } from "../schemas/admin.schema";

/**
 * Get users with pagination and their roles
 * Requires admin.users.viewAll permission
 */
export const getUsersAction = actionClient
  .inputSchema(getUsersSchema)
  .action(async ({ parsedInput }) => {
    // Require permission
    await requirePermission(Permission.Admin.USERS.VIEW_ALL);

    try {
      const { page, limit, search, role, emailVerified, sortBy, sortOrder } =
        parsedInput;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: {
        OR?: Array<
          { name?: { contains: string } } | { email?: { contains: string } }
        >;
        userRoles?: { some?: { role?: { name?: string } } };
        emailVerified?: boolean;
      } = {};

      // Search filter (name or email)
      // Note: SQLite's LIKE is case-insensitive by default, so we don't need mode: "insensitive"
      if (search?.trim()) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } },
        ];
      }

      // Role filter
      if (role?.trim()) {
        where.userRoles = {
          some: {
            role: {
              name: role,
            },
          },
        };
      }

      // Email verified filter
      if (emailVerified === "true") {
        where.emailVerified = true;
      } else if (emailVerified === "false") {
        where.emailVerified = false;
      }

      // Build orderBy
      let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" };

      if (sortBy) {
        const direction = sortOrder === "asc" ? "asc" : "desc";

        if (sortBy === "name") {
          orderBy = { name: direction };
        } else if (sortBy === "email") {
          orderBy = { email: direction };
        } else if (sortBy === "createdAt") {
          orderBy = { createdAt: direction };
        }
      }

      // Get total count for pagination
      const totalCount = await db.user.count({ where });

      // Get paginated users
      const users = await db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        success: true,
        users: users.map((user) => ({
          ...user,
          roles: user.userRoles.map((ur) => ur.role.name),
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
        },
      };
    } catch (error) {
      console.error("Error fetching users:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch users"
      );
    }
  });
