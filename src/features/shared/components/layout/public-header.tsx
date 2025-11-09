"use client";

import {
  BookOpen,
  Building2,
  ChartBar,
  ChevronDown,
  File,
  FileText,
  HelpCircle,
  Info,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Menu,
  Newspaper,
  Scale,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/features/auth/actions/logout.action";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/features/shared/components/ui/avatar";
import { Button } from "@/features/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/features/shared/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/features/shared/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/features/shared/components/ui/sheet";

interface PublicHeaderProps {
  user?: {
    name: string | null;
    email: string;
    image?: string | null;
  } | null;
}

export function PublicHeader({ user }: PublicHeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const result = await logoutAction();

    if (result?.serverError) {
      console.error("Logout error:", result.serverError);
      setIsLoggingOut(false);
      return;
    }

    if (result?.data?.success) {
      router.push("/login");
      router.refresh();
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex lg:flex-1">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-200">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Finances Management
                </span>
                <p className="text-sm text-muted-foreground -mt-1">
                  Professional Solutions
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav
            className="hidden lg:flex items-center space-x-6"
            aria-label="Main navigation"
          >
            {/* User Profile Section */}
            {user ? (
              <div className="ml-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.image || undefined}
                          alt={user.name || user.email}
                        />
                        <AvatarFallback>
                          {getInitials(user.name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.name || "User"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>
                        {isLoggingOut ? "Signing out..." : "Sign Out"}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="ml-6 flex items-center space-x-3">
                <Button asChild variant="ghost">
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-sm">
              <SheetHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <SheetTitle>Menu</SheetTitle>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {/* Auth Section */}
                {user ? (
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center space-x-3 px-2">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={user.image || undefined}
                          alt={user.name || user.email}
                        />
                        <AvatarFallback>
                          {getInitials(user.name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {user.name || "User"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      asChild
                      className="w-full justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link href="/dashboard" className="flex items-center">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-destructive"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {isLoggingOut ? "Signing out..." : "Sign Out"}
                    </Button>
                  </div>
                ) : (
                  <div className="pt-4 border-t space-y-3">
                    <Button asChild variant="outline" className="w-full">
                      <Link
                        href="/login"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link
                        href="/register"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        List Your Business
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
