import { requireAuth } from "@/features/shared/lib/auth/require-auth";
import { getContactAction } from "@/features/contacts/actions/get-contact.action";
import { ContactDetail } from "@/features/contacts/components/contact-detail";
import { SetBreadcrumbs } from "@/features/shared/components/layout/set-breadcrumbs";
import { Button } from "@/features/shared/components/ui/button";
import Link from "next/link";

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  await requireAuth();
  const { id } = await params;

  // Fetch contact to get the name for breadcrumbs
  const result = await getContactAction({ contactId: id });
  const contact = result?.data?.success ? result.data.contact : null;

  return (
    <SetBreadcrumbs
      breadcrumbs={[
        { label: "Contacts", href: "/contacts" },
        {
          label: contact
            ? `${contact.firstName} ${contact.lastName}`
            : "Contact",
          href: `/contacts/${id}`,
        },
        { label: "Details" },
      ]}
    >
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contact Details</h1>
            <p className="text-muted-foreground mt-2">
              View and manage your contact
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/contacts">Back to Contacts</Link>
          </Button>
        </div>

        <ContactDetail contactId={id} />
      </div>
    </SetBreadcrumbs>
  );
}
