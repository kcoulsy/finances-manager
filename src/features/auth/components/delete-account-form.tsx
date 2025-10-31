"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccountAction } from "../actions/delete-account.action";
import { Button } from "@/features/shared/components/ui/button";
import { PasswordInput } from "@/features/shared/components/ui/password-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/features/shared/components/ui/card";

export function DeleteAccountForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirmDelete) {
      setError("Please confirm deletion by checking the box");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;

    const result = await deleteAccountAction({ password });

    if (result?.serverError) {
      setError(result.serverError);
      setIsLoading(false);
      return;
    }

    if (result?.data?.success) {
      router.push("/login?message=Account deleted successfully");
      router.refresh();
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Delete Account</CardTitle>
        <CardDescription>
          Permanently delete your account and all associated data. This action cannot be undone.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Confirm Password
            </label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
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
              disabled={isLoading}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="confirmDelete" className="text-sm font-medium">
              I understand this action cannot be undone
            </label>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            variant="destructive"
            disabled={isLoading || !confirmDelete}
          >
            {isLoading ? "Deleting..." : "Delete Account"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

