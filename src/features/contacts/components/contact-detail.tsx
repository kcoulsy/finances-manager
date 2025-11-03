import { getContactAction } from "../actions/get-contact.action";
import { ContactDetailView } from "./contact-detail-view";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/features/shared/components/ui/card";

interface ContactDetailProps {
  contactId: string;
}

export async function ContactDetail({ contactId }: ContactDetailProps) {
  const result = await getContactAction({ contactId });

  if (result?.serverError || !result?.data?.success) {
    const errorMessage = result?.serverError || "Failed to load contact";

    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-destructive">{errorMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return <ContactDetailView contact={result.data.contact} />;
}
