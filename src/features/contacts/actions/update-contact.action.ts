"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { updateContactSchema } from "../schemas/contact.schema";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export const updateContactAction = actionClient
  .inputSchema(updateContactSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // Check if contact exists and belongs to user
      const existingContact = await db.contact.findFirst({
        where: {
          id: parsedInput.contactId,
          userId: session.user.id,
          deletedAt: null,
        },
      });

      if (!existingContact) {
        throw new Error("Contact not found");
      }

      // Check if email is being changed and already exists
      if (parsedInput.email !== existingContact.email) {
        const emailExists = await db.contact.findUnique({
          where: {
            email: parsedInput.email,
          },
        });

        if (emailExists && emailExists.id !== parsedInput.contactId) {
          throw new Error("A contact with this email already exists");
        }
      }

      // Normalize company website - add https:// if needed
      let normalizedCompanyWebsite = parsedInput.companyWebsite || null;
      if (normalizedCompanyWebsite && !normalizedCompanyWebsite.match(/^https?:\/\//i)) {
        normalizedCompanyWebsite = `https://${normalizedCompanyWebsite}`;
      }

      const contact = await db.contact.update({
        where: {
          id: parsedInput.contactId,
        },
        data: {
          role: parsedInput.role ?? null,
          status: parsedInput.status ?? existingContact.status,
          engagement: parsedInput.engagement ?? null,
          firstName: parsedInput.firstName,
          lastName: parsedInput.lastName,
          email: parsedInput.email,
          phoneMobile: parsedInput.phoneMobile ?? null,
          phoneHome: parsedInput.phoneHome ?? null,
          phoneWork: parsedInput.phoneWork ?? null,
          notes: parsedInput.notes ?? null,
          personalWebsite: parsedInput.personalWebsite ?? null,
          linkedinUrl: parsedInput.linkedinUrl ?? null,
          twitterHandle: parsedInput.twitterHandle ?? null,
          facebookUrl: parsedInput.facebookUrl ?? null,
          instagramHandle: parsedInput.instagramHandle ?? null,
          companyName: parsedInput.companyName ?? null,
          companyWebsite: normalizedCompanyWebsite,
          vatNumber: parsedInput.vatNumber ?? null,
          registrationNumber: parsedInput.registrationNumber ?? null,
          accountsEmail: parsedInput.accountsEmail ?? null,
          position: parsedInput.position ?? null,
        },
      });

      revalidatePath("/contacts");
      revalidatePath(`/contacts/${contact.id}`);

      return {
        success: true,
        contact,
        toast: {
          message: "Contact updated successfully",
          type: "success",
          description: `${contact.firstName} ${contact.lastName} has been updated.`,
        },
      };
    } catch (error) {
      console.error("Update contact error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to update contact",
      );
    }
  });

