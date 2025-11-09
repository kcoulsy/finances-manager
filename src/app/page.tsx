import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  DollarSign,
  HardHat,
  Shield,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { PublicHeader } from "@/features/shared/components/layout/public-header";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { getSession } from "@/features/shared/lib/auth/get-session";

export default async function Home() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <PublicHeader
        user={
          session?.user
            ? {
                name: session.user.name,
                email: session.user.email,
                image: session.user.image,
              }
            : null
        }
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl"></div>
    </div>
  );
}
