import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { customSession } from "better-auth/plugins";
import {
  sendResetPassword,
  sendVerificationEmail,
} from "@/features/auth/lib/email";
import { db } from "../db/client";
import { getUserRoles } from "./get-user-roles";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      await sendResetPassword({ user, url, token });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }) => {
      await sendVerificationEmail({ user, url, token });
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache for 5 minutes
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  plugins: [
    customSession(async ({ user, session }) => {
      // Use cached roles fetcher - caches per userId for 5 minutes
      // This significantly reduces database queries when session is checked
      const roles = await getUserRoles(user.id);

      return {
        user,
        session,
        roles,
      };
    }),
    // mcp({
    //   loginPage: "/sign-in", // path to your login page
    // }),
  ],
});
