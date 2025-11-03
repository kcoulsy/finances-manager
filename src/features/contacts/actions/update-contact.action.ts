"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { updateContactSchema } from "../schemas/contact.schema";

export const updateContactAction = actionClient
  .inputSchema(updateContactSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

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

      // Check if email is being changed and already exists for this user
      if (parsedInput.email !== existingContact.email) {
        const emailExists = await db.contact.findFirst({
          where: {
            email: parsedInput.email,
            userId: session.user.id,
            deletedAt: null,
          },
        });

        if (emailExists && emailExists.id !== parsedInput.contactId) {
          throw new Error("A contact with this email already exists");
        }
      }

      // Normalize company website - add https:// if needed
      let normalizedCompanyWebsite = parsedInput.companyWebsite || null;
      if (
        normalizedCompanyWebsite &&
        !normalizedCompanyWebsite.match(/^https?:\/\//i)
      ) {
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

      // Handle addresses - delete existing and create new ones
      if (parsedInput.addresses !== undefined) {
        // Delete all existing addresses for this contact
        await db.address.deleteMany({
          where: {
            addressableType: "Contact",
            addressableId: contact.id,
          },
        });

        // Create new addresses if provided
        if (parsedInput.addresses.length > 0) {
          // If any address is marked as primary, unset others first
          const hasPrimary = parsedInput.addresses.some(
            (addr) => addr.isPrimary,
          );
          if (hasPrimary) {
            // Keep only first primary
            const primaryAddresses = parsedInput.addresses
              .map((addr, index) => (addr.isPrimary ? index : null))
              .filter((idx) => idx !== null) as number[];

            if (primaryAddresses.length > 1) {
              // Unset all but first
              for (let i = 1; i < primaryAddresses.length; i++) {
                const addrIndex = primaryAddresses[i];
                if (addrIndex !== null && addrIndex !== undefined) {
                  const address = parsedInput.addresses[addrIndex];
                  if (address) {
                    address.isPrimary = false;
                  }
                }
              }
            }
          }

          await db.address.createMany({
            data: parsedInput.addresses.map((addr) => ({
              addressableType: "Contact",
              addressableId: contact.id,
              type: addr.type,
              label: addr.label ?? null,
              addressLine1: addr.addressLine1,
              addressLine2: addr.addressLine2 ?? null,
              locality: addr.locality ?? null,
              city: addr.city,
              county: addr.county ?? null,
              postalCode: addr.postalCode,
              country: addr.country,
              isPrimary: addr.isPrimary,
              isActive: addr.isActive ?? true,
              notes: addr.notes ?? null,
            })),
          });
        }
      }

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

      // Provide user-friendly error messages
      let errorMessage = "Failed to update contact";

      if (error instanceof Error) {
        const errorStr = error.message;

        // Handle authentication errors
        if (errorStr.includes("Unauthorized")) {
          errorMessage = "You need to be logged in to update contacts.";
        }
        // Handle not found errors
        else if (
          errorStr.includes("not found") ||
          errorStr.includes("Not found")
        ) {
          errorMessage = "Contact not found.";
        }
        // Handle unique constraint violations
        else if (
          errorStr.includes("Unique constraint") ||
          errorStr.includes("already exists")
        ) {
          errorMessage = "A contact with this email already exists.";
        }
        // Use the error message if it's already user-friendly
        else if (
          !errorStr.includes("Prisma") &&
          !errorStr.includes("TURBOPACK") &&
          !errorStr.includes("P2025")
        ) {
          errorMessage = errorStr;
        }
      }

      throw new Error(errorMessage);
    }
  });
