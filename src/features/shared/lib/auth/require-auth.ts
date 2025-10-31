import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "./config";

/**
 * Requires authentication for a page.
 * Redirects to login if user is not authenticated.
 * Returns the session if authenticated.
 */
export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }
}

