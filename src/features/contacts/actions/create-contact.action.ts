"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { createContactSchema } from "../schemas/contact.schema";

export const createContactAction = actionClient
  .inputSchema(createContactSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // Check if email already exists for this user
      const existingContact = await db.contact.findFirst({
        where: {
          email: parsedInput.email,
          userId: session.user.id,
          deletedAt: null,
        },
      });

      if (existingContact) {
        throw new Error("A contact with this email already exists");
      }

      // Normalize company website - add https:// if needed
      let normalizedCompanyWebsite = parsedInput.companyWebsite || null;
      if (
        normalizedCompanyWebsite &&
        !normalizedCompanyWebsite.match(/^https?:\/\//i)
      ) {
        normalizedCompanyWebsite = `https://${normalizedCompanyWebsite}`;
      }

      // Build contact data object, only including fields that are provided
      const contactData: Record<string, unknown> = {
        userId: session.user.id,
        status: parsedInput.status,
        firstName: parsedInput.firstName,
        lastName: parsedInput.lastName,
        email: parsedInput.email,
        role: parsedInput.role ?? null,
        engagement: parsedInput.engagement ?? null,
        phoneMobile: parsedInput.phoneMobile ?? null,
        phoneHome: parsedInput.phoneHome ?? null,
        phoneWork: parsedInput.phoneWork ?? null,
        notes: parsedInput.notes ?? null,
        personalWebsite: parsedInput.personalWebsite ?? null,
        linkedinUrl: parsedInput.linkedinUrl ?? null,
        twitterHandle: parsedInput.twitterHandle ?? null,
        facebookUrl: parsedInput.facebookUrl ?? null,
        instagramHandle: parsedInput.instagramHandle ?? null,
      };

      // Only include company fields if they are explicitly provided (not undefined)
      if (parsedInput.companyName !== undefined) {
        contactData.companyName = parsedInput.companyName || null;
      }
      if (normalizedCompanyWebsite !== undefined) {
        contactData.companyWebsite = normalizedCompanyWebsite;
      }
      if (parsedInput.vatNumber !== undefined) {
        contactData.vatNumber = parsedInput.vatNumber || null;
      }
      if (parsedInput.registrationNumber !== undefined) {
        contactData.registrationNumber = parsedInput.registrationNumber || null;
      }
      if (parsedInput.accountsEmail !== undefined) {
        contactData.accountsEmail = parsedInput.accountsEmail || null;
      }
      if (parsedInput.position !== undefined) {
        contactData.position = parsedInput.position || null;
      }

      const contact = await db.contact.create({
        data: contactData as Parameters<typeof db.contact.create>[0]["data"],
      });

      // Create addresses if provided
      if (parsedInput.addresses && parsedInput.addresses.length > 0) {
        // If any address is marked as primary, unset others first
        const hasPrimary = parsedInput.addresses.some((addr) => addr.isPrimary);
        if (hasPrimary) {
          // This will be handled per address creation
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

        // If multiple addresses were marked as primary, keep only the first one as primary
        const primaryAddresses = parsedInput.addresses
          .map((addr, index) => (addr.isPrimary ? index : null))
          .filter((idx) => idx !== null) as number[];

        if (primaryAddresses.length > 1) {
          // Keep only first as primary, unset others
          for (let i = 1; i < primaryAddresses.length; i++) {
            const addrIndex = primaryAddresses[i];
            const addr = parsedInput.addresses[addrIndex];
            await db.address.updateMany({
              where: {
                addressableType: "Contact",
                addressableId: contact.id,
                addressLine1: addr.addressLine1,
                city: addr.city,
                postalCode: addr.postalCode,
              },
              data: {
                isPrimary: false,
              },
            });
          }
        }
      }

      revalidatePath("/contacts");

      return {
        success: true,
        contact,
        toast: {
          message: "Contact created successfully",
          type: "success",
          description: `${contact.firstName} ${contact.lastName} has been added to your contacts.`,
        },
      };
    } catch (error) {
      console.error("Create contact error:", error);

      // Provide user-friendly error messages
      let errorMessage = "Failed to create contact";

      if (error instanceof Error) {
        const errorStr = error.message;

        // Handle Prisma schema mismatch errors
        if (
          errorStr.includes("Unknown argument") ||
          errorStr.includes("does not exist")
        ) {
          errorMessage =
            "The database schema needs to be updated. Please contact support or refresh the page.";
        }
        // Handle unique constraint violations
        else if (
          errorStr.includes("Unique constraint") ||
          errorStr.includes("already exists")
        ) {
          errorMessage = "A contact with this email already exists.";
        }
        // Handle authentication errors
        else if (errorStr.includes("Unauthorized")) {
          errorMessage = "You need to be logged in to create contacts.";
        }
        // Use the error message if it's already user-friendly
        else if (
          !errorStr.includes("Prisma") &&
          !errorStr.includes("TURBOPACK")
        ) {
          errorMessage = errorStr;
        }
      }

      throw new Error(errorMessage);
    }
  });
