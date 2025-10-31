import { sendEmail } from "@/features/shared/lib/utils/email";

/**
 * Send a verification email
 * Used by Better Auth for email verification
 */
export async function sendVerificationEmail({
  user,
  url,
  token: _token,
}: {
  user: { email: string; name?: string | null };
  url: string;
  token: string;
}) {
  return sendEmail({
    to: user.email,
    subject: "Verify your email address",
    html: `
      <h1>Verify Your Email</h1>
      <p>Hello${user.name ? ` ${user.name}` : ""},</p>
      <p>Click the link below to verify your email address:</p>
      <p><a href="${url}">${url}</a></p>
      <p>If you didn't create an account, please ignore this email.</p>
    `,
    text: `
      Verify Your Email
      
      Hello${user.name ? ` ${user.name}` : ""},
      
      Click the link below to verify your email address:
      ${url}
      
      If you didn't create an account, please ignore this email.
    `,
  });
}

/**
 * Send a password reset email
 * Used by Better Auth for password reset
 */
export async function sendResetPassword({
  user,
  url,
  token: _token,
}: {
  user: { email: string; name?: string | null };
  url: string;
  token: string;
}) {
  return sendEmail({
    to: user.email,
    subject: "Reset your password",
    html: `
      <h1>Reset Your Password</h1>
      <p>Hello${user.name ? ` ${user.name}` : ""},</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${url}">${url}</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
    text: `
      Reset Your Password
      
      Hello${user.name ? ` ${user.name}` : ""},
      
      Click the link below to reset your password:
      ${url}
      
      This link will expire in 1 hour.
      
      If you didn't request this, please ignore this email.
    `,
  });
}
