"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordAction } from "../actions/change-password.action";
import { changePasswordSchema } from "../schemas/auth.schema";
import type { ChangePasswordInput } from "../schemas/auth.schema";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { Button } from "@/features/shared/components/ui/button";
import { PasswordInput } from "@/features/shared/components/ui/password-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/features/shared/components/ui/card";

export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const {
    execute,
    status,
  } = useActionWithToast(changePasswordAction, {
    successToast: {
      message: "Password changed successfully",
      type: "success",
      description: "Your password has been updated.",
    },
    onSuccess: ({ data }) => {
      if (data?.success) {
        reset();
      }
    },
    onError: ({ error }) => {
      // Set form error when there's a server error
      if (error?.serverError) {
        setError("root", {
          message: typeof error.serverError === "string" ? error.serverError : String(error.serverError),
        });
      }
      // Handle validation errors
      if (error?.validationErrors && typeof error.validationErrors === "object") {
        Object.entries(error.validationErrors).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0 && typeof messages[0] === "string") {
            setError(field as keyof ChangePasswordInput, {
              type: "validation",
              message: messages[0],
            });
          }
        });
      }
    },
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    // Clear any previous root errors before submitting
    if (errors.root) {
      setError("root", { message: undefined });
    }

    await execute({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
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
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="text-sm font-medium">
              Current Password
            </label>
            <PasswordInput
              id="currentPassword"
              placeholder="••••••••"
              disabled={status === "executing"}
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
              disabled={status === "executing"}
              aria-invalid={errors.newPassword ? "true" : "false"}
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" disabled={status === "executing"}>
            {status === "executing" ? "Changing..." : "Change Password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
