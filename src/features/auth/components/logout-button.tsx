"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { logoutAction } from "../actions/logout.action";

interface LogoutButtonProps {
  variant?:
    | "default"
    | "outline"
    | "destructive"
    | "secondary"
    | "ghost"
    | "link";
  className?: string;
  children?: React.ReactNode;
}

export function LogoutButton({
  variant = "outline",
  className,
  children,
}: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    const result = await logoutAction();

    if (result?.serverError) {
      console.error("Logout error:", result.serverError);
      setIsLoading(false);
      return;
    }

    if (result?.data?.success) {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? "Signing out..." : children || "Sign Out"}
    </Button>
  );
}
