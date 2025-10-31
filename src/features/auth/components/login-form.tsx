"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { signIn } from "@/features/shared/lib/auth/client";
import { loginSchema } from "../schemas/auth.schema";
import type { LoginInput } from "../schemas/auth.schema";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { PasswordInput } from "@/features/shared/components/ui/password-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/features/shared/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        setError("root", {
          message: result.error.message || "Failed to sign in",
        });
        return;
      }

      if (result.data) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("root", {
        message: err instanceof Error ? err.message : "Failed to sign in",
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Enter your credentials to access your account</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {errors.root && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.root.message}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              disabled={isSubmitting}
              aria-invalid={errors.email ? "true" : "false"}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              disabled={isSubmitting}
              aria-invalid={errors.password ? "true" : "false"}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
          <div className="text-sm text-center">
            <a href="/forgot-password" className="text-primary hover:underline">
              Forgot password?
            </a>
          </div>
          <div className="text-sm text-center">
            Don't have an account?{" "}
            <a href="/register" className="text-primary hover:underline">
              Sign up
            </a>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
