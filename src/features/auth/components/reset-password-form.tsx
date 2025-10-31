"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPasswordAction } from "../actions/reset-password.action";
import { resetPasswordSchema } from "../schemas/auth.schema";
import type { ResetPasswordInput } from "../schemas/auth.schema";
import { Button } from "@/features/shared/components/ui/button";
import { PasswordInput } from "@/features/shared/components/ui/password-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/features/shared/components/ui/card";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError("token", {
        message: "Invalid or missing reset token",
      });
    } else {
      setToken(tokenParam);
      setValue("token", tokenParam);
    }
  }, [searchParams, setError, setValue]);

  const onSubmit = async (data: ResetPasswordInput) => {
    if (!token) return;

    const result = await resetPasswordAction({ token, newPassword: data.newPassword });

    if (result?.serverError) {
      setError("root", {
        message: result.serverError,
      });
      return;
    }

    if (result?.data?.success) {
      router.push("/login?message=Password reset successfully");
    }
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invalid Reset Token</CardTitle>
          <CardDescription>The password reset link is invalid or has expired.</CardDescription>
        </CardHeader>
        <CardFooter>
          <a href="/forgot-password" className="text-sm text-primary hover:underline">
            Request a new reset link
          </a>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Enter your new password below.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {errors.root && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.root.message}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">
              New Password
            </label>
            <PasswordInput
              id="newPassword"
              placeholder="••••••••"
              disabled={isSubmitting}
              aria-invalid={errors.newPassword ? "true" : "false"}
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isSubmitting || !token}>
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </Button>
          <div className="text-sm text-center">
            <a href="/login" className="text-primary hover:underline">
              Back to sign in
            </a>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
