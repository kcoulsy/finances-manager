import { cache } from "react";
import { db } from "../db/client";

// In-memory cache with TTL
// Key: userId, Value: { roles: string[], timestamp: number }
const rolesCache = new Map<string, { roles: string[]; timestamp: number }>();

// Cache TTL: 5 minutes (same as session cookie cache)
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Gets user roles with in-memory caching.
 * Caches roles for 5 minutes (matching session cookie cache TTL).
 * Also uses React cache() for request-level deduplication.
 */
async function getUserRolesUncached(userId: string): Promise<string[]> {
  const userRoles = await db.userRole.findMany({
    where: {
      userId,
    },
    select: {
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  return userRoles.map((ur) => ur.role.name);
}

/**
 * Gets user roles with caching.
 * Uses in-memory cache (5 min TTL) + React cache() for request deduplication.
 */
export const getUserRoles = cache(async (userId: string): Promise<string[]> => {
  const now = Date.now();

  // Check cache
  const cached = rolesCache.get(userId);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.roles;
  }

  // Fetch fresh roles
  const roles = await getUserRolesUncached(userId);

  // Update cache
  rolesCache.set(userId, { roles, timestamp: now });

  return roles;
});

/**
 * Invalidates the roles cache for a user.
 * Call this when user roles change (e.g., role assignment/removal).
 */
export function invalidateUserRolesCache(userId: string): void {
  rolesCache.delete(userId);
}

/**
 * Clears all roles cache.
 * Useful for testing or when roles change globally.
 */
export function clearRolesCache(): void {
  rolesCache.clear();
}
