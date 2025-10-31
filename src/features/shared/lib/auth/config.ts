import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
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
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendResetPassword({ user, url, token });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
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
    // mcp({
    //   loginPage: "/sign-in", // path to your login page
    // }),
  ],
});
