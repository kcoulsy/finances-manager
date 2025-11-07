import { ContactsList } from "@/features/contacts/components/contacts-list";
import { ContentLayout } from "@/features/shared/components/layout/content-layout";
import { requireAuth } from "@/features/shared/lib/auth/require-auth";

export default async function ContactsPage() {
  await requireAuth();

  return (
    <ContentLayout className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Contacts</h1>
        <p className="text-muted-foreground mt-2">Manage your contacts</p>
      </div>

      <ContactsList />
    </ContentLayout>
  );
}
