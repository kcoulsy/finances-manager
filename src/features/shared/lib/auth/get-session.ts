import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./config";

/**
 * Gets the current session from the auth API.
 * This is a convenience wrapper around auth.api.getSession().
 * Uses React cache() to deduplicate session requests within the same request.
 */
export const getSession = cache(async () => {
  return await auth.api.getSession({
    headers: await headers(),
  });
});
