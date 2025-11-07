import Link from "next/link";
import { ContactForm } from "@/features/contacts/components/contact-form";
import { ContentLayout } from "@/features/shared/components/layout/content-layout";
import { Button } from "@/features/shared/components/ui/button";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";

export default async function NewContactPage() {
  await requireAuth();

  return (
    <ContentLayout className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">New Contact</h1>
          <p className="text-muted-foreground mt-2">
            Add a new contact to your address book
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/contacts">Back to Contacts</Link>
        </Button>
      </div>

      <ContactForm />
    </ContentLayout>
  );
}
