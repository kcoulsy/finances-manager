"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { changePasswordAction } from "../actions/change-password.action";
import { changePasswordSchema } from "../schemas/auth.schema";
import type { ChangePasswordInput } from "../schemas/auth.schema";
import { Button } from "@/features/shared/components/ui/button";
import { PasswordInput } from "@/features/shared/components/ui/password-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/features/shared/components/ui/card";

export function ChangePasswordForm() {
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    const result = await changePasswordAction({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    if (result?.serverError) {
      setError("root", {
        message: result.serverError,
      });
      return;
    }

    if (result?.data?.success) {
      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {errors.root && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.root.message}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
              Password changed successfully!
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="text-sm font-medium">
              Current Password
            </label>
            <PasswordInput
              id="currentPassword"
              placeholder="••••••••"
              disabled={isSubmitting}
              aria-invalid={errors.currentPassword ? "true" : "false"}
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
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
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Changing..." : "Change Password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
