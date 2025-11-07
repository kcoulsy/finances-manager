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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl mb-8 shadow-lg">
            <Building2 className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            A Safer Way to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
              Build
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-8">
            Too many building projects suffer from confusion, delays, and
            disputes. We've built a platform that puts both clients and service
            providers on equal footing — giving you the structure, protection,
            and transparency you need from day one.
          </p>
          <p className="text-lg text-foreground/80 max-w-3xl mx-auto leading-relaxed mb-10">
            Whether you're planning a new extension, managing trades, or
            delivering specialist work — our tools help manage expectations,
            track agreements, control funds, and resolve disagreements fairly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="shadow-lg hover:shadow-xl transition-all"
            >
              <Link href="/services">
                <ArrowRight className="w-5 h-5 mr-2" />
                Explore Services
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="shadow-lg hover:shadow-xl transition-all"
            >
              <Link href="/register">
                <UserPlus className="w-5 h-5 mr-2" />
                Get Started Free
              </Link>
            </Button>
          </div>
        </div>

        {/* Tagline */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-6 py-3 bg-card rounded-full shadow-lg border">
            <CheckCircle2 className="w-5 h-5 text-primary mr-2" />
            <span className="text-lg font-semibold text-foreground">
              Simple. Secure. Built for trust.
            </span>
          </div>
        </div>

        {/* User Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {/* Client Card */}
          <Card className="hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
            <CardHeader className="grow">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl mb-4">Client</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                <strong>Never worry about project chaos again.</strong> Get
                crystal-clear agreements, milestone tracking, and secure
                payments that protect your investment. Join 5,000+ homeowners
                who've completed projects stress-free.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full" size="lg">
                <Link href="/register?role=client">
                  Start Protecting My Project
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Service Provider Card */}
          <Card className="hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
            <CardHeader className="grow">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <HardHat className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl mb-4">Service Provider</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                <strong>
                  Stop chasing payments and start growing your business.
                </strong>{" "}
                Get milestone-based payments, professional contracts, and client
                management tools that help you complete projects profitably.
                Join 3,000+ contractors earning more.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full" size="lg">
                <Link href="/register?role=service-provider">
                  Start Getting Paid Faster
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Professional Card */}
          <Card className="hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
            <CardHeader className="grow">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Briefcase className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl mb-4">Professional</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                <strong>
                  Elevate your professional practice with industry-leading
                  tools.
                </strong>{" "}
                Architects, solicitors, and consultants can streamline project
                management, reduce liability, and deliver exceptional client
                experiences. Join 1,500+ professionals.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full" size="lg">
                <Link href="/register?role=professional">
                  Elevate My Practice
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Guest Card */}
          <Card className="hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
            <CardHeader className="grow">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <User className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl mb-4">Guest</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                <strong>
                  See exactly how we solve construction problems before you
                  commit.
                </strong>{" "}
                Explore our platform, view sample contracts, and understand how
                we protect both clients and service providers. No pressure, just
                clarity.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full" size="lg">
                <Link href="/register?role=guest">Explore Platform</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Features Highlight */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 border-0 shadow-2xl mb-16">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary-foreground mb-4">
              Why Choose Our Platform?
            </CardTitle>
            <CardDescription className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
              Built specifically for construction and home improvement projects
              with features that matter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-foreground/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-primary-foreground mb-2">
                  Clear Agreements
                </h3>
                <p className="text-primary-foreground/90">
                  Templated contracts and custom agreements to protect all
                  parties.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-foreground/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-primary-foreground mb-2">
                  Secure Payments
                </h3>
                <p className="text-primary-foreground/90">
                  Fund control and milestone-based payment releases for peace of
                  mind.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-foreground/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-primary-foreground mb-2">
                  Expert Support
                </h3>
                <p className="text-primary-foreground/90">
                  Access to industry experts and dispute resolution when needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
