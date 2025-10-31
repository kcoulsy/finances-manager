import type { auth } from "./config";

/**
 * Extended session type with roles included from customSession plugin
 */
export type SessionWithRoles = Awaited<
  ReturnType<typeof auth.api.getSession>
> & {
  roles?: string[];
};

