import { redirect } from "next/navigation";
import { getSession } from "./get-session";

/**
 * Requires authentication for a page.
 * Redirects to login if user is not authenticated.
 * Returns the session if authenticated.
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

/**
 * Requires no authentication (for login/register pages).
 * Redirects to dashboard if user is already authenticated.
 */
export async function requireNoAuth() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }
}
