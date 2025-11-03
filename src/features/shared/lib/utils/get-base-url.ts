/**
 * Gets the base URL for the application
 * Checks environment variables in order: BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL
 * Falls back to http://localhost:3000 if neither is set
 *
 * @returns The base URL for the application
 */
export function getBaseUrl(): string {
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  );
}
