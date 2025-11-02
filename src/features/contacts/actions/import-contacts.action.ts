"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { importContactsSchema } from "../schemas/contact.schema";

// Parse vCard content
function parseVCard(content: string): Array<{
  firstName: string;
  lastName: string;
  email: string;
  phoneMobile?: string;
  phoneHome?: string;
  phoneWork?: string;
  notes?: string;
  personalWebsite?: string;
  companyName?: string;
  position?: string;
}> {
  const contacts: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phoneMobile?: string;
    phoneHome?: string;
    phoneWork?: string;
    notes?: string;
    personalWebsite?: string;
    companyName?: string;
    position?: string;
  }> = [];

  // Split by BEGIN:VCARD and END:VCARD
  const vcardBlocks = content
    .split(/END:VCARD/i)
    .filter((block) => block.trim());

  for (const block of vcardBlocks) {
    if (!block.includes("BEGIN:VCARD")) continue;

    const lines = block.split(/\r?\n/);
    let firstName = "";
    let lastName = "";
    let email = "";
    let phoneMobile: string | undefined;
    let phoneHome: string | undefined;
    let phoneWork: string | undefined;
    let notes: string | undefined;
    let personalWebsite: string | undefined;
    let companyName: string | undefined;
    let position: string | undefined;

    for (const line of lines) {
      const upperLine = line.toUpperCase();

      // Parse N (Name) - Format: N:LastName;FirstName;MiddleName;Prefix;Suffix
      if (upperLine.startsWith("N:")) {
        const parts = line.substring(2).split(";");
        lastName = parts[0]?.trim() || "";
        firstName = parts[1]?.trim() || "";
      }

      // Parse FN (Full Name) - Fallback if N is not available
      if (!firstName && !lastName && upperLine.startsWith("FN:")) {
        const fullName = line.substring(3).trim();
        const nameParts = fullName.split(/\s+/);
        if (nameParts.length >= 2) {
          firstName = nameParts[0] || "";
          lastName = nameParts.slice(1).join(" ") || "";
        } else {
          firstName = fullName;
        }
      }

      // Parse EMAIL
      if (upperLine.startsWith("EMAIL")) {
        const emailMatch = line.match(/EMAIL[;:]([^:]+)?:(.+)/i);
        if (emailMatch?.[2]) {
          email = emailMatch[2].trim();
        }
      }

      // Parse TEL (Phone)
      if (upperLine.startsWith("TEL")) {
        const telMatch = line.match(/TEL[;:]([^:]*)?:([\d\s+\-()]+)/i);
        if (telMatch?.[2]) {
          const phone = telMatch[2].trim();
          const type = telMatch[1]?.toUpperCase() || "";

          if (type.includes("CELL") || type.includes("MOBILE")) {
            phoneMobile = phone;
          } else if (type.includes("HOME")) {
            phoneHome = phone;
          } else if (type.includes("WORK")) {
            phoneWork = phone;
          } else {
            // Default to mobile if no type specified
            phoneMobile = phone;
          }
        }
      }

      // Parse NOTE
      if (upperLine.startsWith("NOTE:")) {
        notes = line.substring(5).trim();
      }

      // Parse URL
      if (upperLine.startsWith("URL:")) {
        personalWebsite = line.substring(4).trim();
      }

      // Parse ORG (Organization/Company)
      if (upperLine.startsWith("ORG:")) {
        const org = line.substring(4).trim();
        if (org) {
          companyName = org;
        }
      }

      // Parse TITLE (Position)
      if (upperLine.startsWith("TITLE:")) {
        position = line.substring(6).trim();
      }
    }

    // Only add contact if we have at least first name, last name, or email
    if (firstName || lastName || email) {
      contacts.push({
        firstName: firstName || "Unknown",
        lastName: lastName || "",
        email:
          email ||
          `${firstName}${lastName}@imported.local`
            .toLowerCase()
            .replace(/\s+/g, ""),
        phoneMobile,
        phoneHome,
        phoneWork,
        notes,
        personalWebsite,
        companyName,
        position,
      });
    }
  }

  return contacts;
}

// Parse CSV content
function parseCSV(content: string): Array<{
  firstName: string;
  lastName: string;
  email: string;
  status?: "PERSONAL" | "ENQUIRY" | "CLIENT" | "SUPPLIER";
  phoneMobile?: string;
  phoneHome?: string;
  phoneWork?: string;
  notes?: string;
  personalWebsite?: string;
  companyName?: string;
  companyWebsite?: string;
  position?: string;
}> {
  const contacts: Array<{
    firstName: string;
    lastName: string;
    email: string;
    status?: "PERSONAL" | "ENQUIRY" | "CLIENT" | "SUPPLIER";
    phoneMobile?: string;
    phoneHome?: string;
    phoneWork?: string;
    notes?: string;
    personalWebsite?: string;
    companyName?: string;
    companyWebsite?: string;
    position?: string;
  }> = [];

  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return contacts;

  // Parse header row
  const headerLine = lines[0];
  const headers = headerLine
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  // Find column indices
  const firstNameIdx = headers.findIndex(
    (h) =>
      h === "first name" ||
      h === "firstname" ||
      h === "first_name" ||
      h === "fname",
  );
  const lastNameIdx = headers.findIndex(
    (h) =>
      h === "last name" ||
      h === "lastname" ||
      h === "last_name" ||
      h === "lname",
  );
  const emailIdx = headers.findIndex(
    (h) => h === "email" || h === "email address" || h === "e-mail",
  );
  const statusIdx = headers.findIndex((h) => h === "status");
  const phoneMobileIdx = headers.findIndex(
    (h) =>
      h === "mobile" ||
      h === "phone mobile" ||
      h === "mobile phone" ||
      h === "phone_mobile",
  );
  const phoneHomeIdx = headers.findIndex(
    (h) =>
      h === "home" ||
      h === "phone home" ||
      h === "home phone" ||
      h === "phone_home",
  );
  const phoneWorkIdx = headers.findIndex(
    (h) =>
      h === "work" ||
      h === "phone work" ||
      h === "work phone" ||
      h === "phone_work",
  );
  const notesIdx = headers.findIndex(
    (h) => h === "notes" || h === "note" || h === "comments",
  );
  const websiteIdx = headers.findIndex(
    (h) => h === "website" || h === "url" || h === "personal website",
  );
  const companyIdx = headers.findIndex(
    (h) =>
      h === "company" ||
      h === "company name" ||
      h === "companyname" ||
      h === "company_name" ||
      h === "business name" ||
      h === "businessname" ||
      h === "business_name" ||
      h === "organization" ||
      h === "org",
  );
  const positionIdx = headers.findIndex(
    (h) =>
      h === "position" || h === "title" || h === "role" ||       h === "job title" ||
      h === "jobtitle" ||
      h === "job_title" ||
      h === "business position" ||
      h === "businessposition" ||
      h === "business_position",
  );
  const businessPhoneIdx = headers.findIndex(
    (h) =>
      h === "business phone" ||
      h === "businessphone" ||
      h === "business_phone",
  );
  const companyWebsiteIdx = headers.findIndex(
    (h) =>
      h === "company website" ||
      h === "companywebsite" ||
      h === "company_website" ||
      h === "business website" ||
      h === "businesswebsite" ||
      h === "business_website",
  );

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));

    const firstName = firstNameIdx >= 0 ? values[firstNameIdx] || "" : "";
    const lastName = lastNameIdx >= 0 ? values[lastNameIdx] || "" : "";
    const email = emailIdx >= 0 ? values[emailIdx] || "" : "";
    
    // Parse status (convert lowercase to uppercase enum)
    let status: "PERSONAL" | "ENQUIRY" | "CLIENT" | "SUPPLIER" | undefined;
    if (statusIdx >= 0 && values[statusIdx]) {
      const statusValue = values[statusIdx].toUpperCase().trim();
      if (
        statusValue === "PERSONAL" ||
        statusValue === "ENQUIRY" ||
        statusValue === "CLIENT" ||
        statusValue === "SUPPLIER"
      ) {
        status = statusValue as "PERSONAL" | "ENQUIRY" | "CLIENT" | "SUPPLIER";
      } else {
        // Map common lowercase values
        if (statusValue === "CLIENT") status = "CLIENT";
        else if (statusValue === "SUPPLIER") status = "SUPPLIER";
        else if (statusValue === "ENQUIRY" || statusValue === "INQUIRY")
          status = "ENQUIRY";
        else status = "PERSONAL";
      }
    }

    const phoneMobile =
      phoneMobileIdx >= 0 ? values[phoneMobileIdx] || undefined : undefined;
    const phoneHome =
      phoneHomeIdx >= 0 ? values[phoneHomeIdx] || undefined : undefined;
    let phoneWork =
      phoneWorkIdx >= 0 ? values[phoneWorkIdx] || undefined : undefined;
    
    // If Business Phone is provided and Work Phone is empty, use Business Phone
    const businessPhone =
      businessPhoneIdx >= 0
        ? values[businessPhoneIdx] || undefined
        : undefined;
    if (businessPhone && !phoneWork) {
      phoneWork = businessPhone;
    }

    const notes = notesIdx >= 0 ? values[notesIdx] || undefined : undefined;
    const personalWebsite =
      websiteIdx >= 0 ? values[websiteIdx] || undefined : undefined;
    const companyName =
      companyIdx >= 0 ? values[companyIdx] || undefined : undefined;
    const companyWebsite =
      companyWebsiteIdx >= 0
        ? values[companyWebsiteIdx] || undefined
        : undefined;
    const position =
      positionIdx >= 0 ? values[positionIdx] || undefined : undefined;

    // Only add if we have at least first name, last name, or email
    if (firstName || lastName || email) {
      contacts.push({
        firstName: firstName || "Unknown",
        lastName: lastName || "",
        email:
          email ||
          `${firstName}${lastName}@imported.local`
            .toLowerCase()
            .replace(/\s+/g, ""),
        status,
        phoneMobile,
        phoneHome,
        phoneWork,
        notes,
        personalWebsite,
        companyName,
        companyWebsite,
        position,
      });
    }
  }

  return contacts;
}

export const importContactsAction = actionClient
  .inputSchema(importContactsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // Parse contacts based on file type
      let parsedContacts: Array<{
        firstName: string;
        lastName: string;
        email: string;
        status?: "PERSONAL" | "ENQUIRY" | "CLIENT" | "SUPPLIER";
        phoneMobile?: string;
        phoneHome?: string;
        phoneWork?: string;
        notes?: string;
        personalWebsite?: string;
        companyName?: string;
        companyWebsite?: string;
        position?: string;
      }>;

      if (parsedInput.fileType === "vcard") {
        parsedContacts = parseVCard(parsedInput.fileContent);
      } else {
        parsedContacts = parseCSV(parsedInput.fileContent);
      }

      if (parsedContacts.length === 0) {
        throw new Error("No contacts found in the file");
      }

      // Check for existing emails
      const emails = parsedContacts.map((c) => c.email);
      const existingContacts = await db.contact.findMany({
        where: {
          email: { in: emails },
          userId: session.user.id,
        },
      });

      const existingEmails = new Set(existingContacts.map((c) => c.email));

      // Filter out contacts that already exist and create new ones
      const contactsToCreate = parsedContacts.filter(
        (c) => !existingEmails.has(c.email),
      );

      if (contactsToCreate.length === 0) {
        throw new Error("All contacts already exist in your address book");
      }

      // Create contacts in batch
      const createdContacts = [];
      const errors: string[] = [];

      for (const contactData of contactsToCreate) {
        try {
          // Normalize company website if provided
          let normalizedCompanyWebsite: string | null = null;
          if (contactData.personalWebsite) {
            normalizedCompanyWebsite = contactData.personalWebsite;
            if (!normalizedCompanyWebsite.match(/^https?:\/\//i)) {
              normalizedCompanyWebsite = `https://${normalizedCompanyWebsite}`;
            }
          }

          // Build contact data object
          const data: Record<string, unknown> = {
            userId: session.user.id,
            status: "PERSONAL" as const,
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            email: contactData.email,
            phoneMobile: contactData.phoneMobile || null,
            phoneHome: contactData.phoneHome || null,
            phoneWork: contactData.phoneWork || null,
            notes: contactData.notes || null,
            personalWebsite: normalizedCompanyWebsite,
          };

          // Only include company fields if provided
          if (contactData.companyName !== undefined) {
            data.companyName = contactData.companyName || null;
          }
          if (contactData.position !== undefined) {
            data.position = contactData.position || null;
          }

          const contact = await db.contact.create({
            data: data as Parameters<typeof db.contact.create>[0]["data"],
          });

          createdContacts.push(contact);
        } catch (error) {
          errors.push(
            `Failed to import ${contactData.firstName} ${contactData.lastName}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          );
        }
      }

      revalidatePath("/contacts");

      const skippedCount = parsedContacts.length - contactsToCreate.length;
      const errorCount = errors.length;
      const successCount = createdContacts.length;

      let message = `Successfully imported ${successCount} contact${successCount !== 1 ? "s" : ""}`;
      if (skippedCount > 0) {
        message += `. ${skippedCount} contact${skippedCount !== 1 ? "s were" : " was"} skipped (already exist)`;
      }
      if (errorCount > 0) {
        message += `. ${errorCount} contact${errorCount !== 1 ? "s failed" : " failed"} to import`;
      }

      return {
        success: true,
        imported: createdContacts.length,
        skipped: skippedCount,
        errors: errorCount,
        errorMessages: errors,
        toast: {
          message,
          type: successCount > 0 ? "success" : "error",
          description:
            successCount > 0
              ? `${successCount} new contact${successCount !== 1 ? "s have" : " has"} been added to your address book.`
              : "No contacts were imported. Please check the file format and try again.",
        },
      };
    } catch (error) {
      console.error("Import contacts error:", error);

      // Provide user-friendly error messages
      let errorMessage = "Failed to import contacts";

      if (error instanceof Error) {
        const errorStr = error.message;

        // Handle authentication errors
        if (errorStr.includes("Unauthorized")) {
          errorMessage = "You need to be logged in to import contacts.";
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
