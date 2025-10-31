import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { customSession } from "better-auth/plugins";
import { db } from "../db/client";
import {
  sendVerificationEmail,
  sendResetPassword,
} from "@/features/auth/lib/email";

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
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  plugins: [
    customSession(async ({ user, session }) => {
      // Fetch user roles and add them to the session
      const userWithRoles = await db.user.findUnique({
        where: { id: user.id },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      const roles = userWithRoles?.userRoles.map((ur) => ur.role.name) || [];

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
