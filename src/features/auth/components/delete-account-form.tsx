"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { PasswordInput } from "@/features/shared/components/ui/password-input";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { deleteAccountAction } from "../actions/delete-account.action";
import type { DeleteAccountInput } from "../schemas/auth.schema";
import { deleteAccountSchema } from "../schemas/auth.schema";

export function DeleteAccountForm() {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
  });

  const { execute, status } = useActionWithToast(deleteAccountAction, {
    errorToast: {
      message: "Failed to delete account",
      type: "error",
    },
    onError: ({ error }) => {
      // Set form error when there's a server error
      if (error?.serverError) {
        setError("root", {
          message:
            typeof error.serverError === "string"
              ? error.serverError
              : String(error.serverError),
        });
      }
      // Handle validation errors
      if (error?.validationErrors) {
        Object.entries(error.validationErrors).forEach(([field, messages]) => {
          if (messages && messages.length > 0) {
            setError(field as keyof DeleteAccountInput, {
              type: "validation",
              message: messages[0],
            });
          }
        });
      }
    },
    onSuccess: () => {
      // On success, redirect to login (action redirects, but this is a safety net)
      router.push("/login?message=Account deleted successfully");
      router.refresh();
    },
  });

  const onSubmit = async (data: DeleteAccountInput) => {
    if (!confirmDelete) {
      setError("root", {
        message: "Please confirm deletion by checking the box",
      });
      return;
    }

    // Clear any previous root errors before submitting
    if (errors.root) {
      setError("root", { message: undefined });
    }

    await execute({ password: data.password });
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Delete Account</CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {errors.root && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.root.message}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Confirm Password
            </label>
            <PasswordInput
              id="password"
              placeholder="Enter your password"
              disabled={status === "executing"}
              aria-invalid={errors.password ? "true" : "false"}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter your password to confirm account deletion
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="confirmDelete"
              type="checkbox"
              checked={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.checked)}
              disabled={status === "executing"}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="confirmDelete" className="text-sm font-medium">
              I understand this action cannot be undone
            </label>
          </div>
        </CardContent>
        <CardFooter className="mt-6">
          <Button
            type="submit"
            variant="destructive"
            disabled={status === "executing" || !confirmDelete}
          >
            {status === "executing" ? "Deleting..." : "Delete Account"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
