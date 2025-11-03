"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { importContactsSchema } from "../schemas/contact.schema";

/**
 * Get a column value from CSV data by matching header names (case-insensitive)
 * @param headers - Array of lowercased header names
 * @param values - Array of values from a CSV row
 * @param possibleNames - Array of possible header names to match (will be lowercased for comparison)
 * @returns The trimmed value or undefined if not found or empty
 */
function getValue(
  headers: string[],
  values: string[],
  possibleNames: string[],
): string | undefined {
  const lowercasedNames = possibleNames.map((name) => name.toLowerCase());
  const index = headers.findIndex((h) => lowercasedNames.includes(h));

  if (index >= 0 && index < values.length) {
    const trimmed = values[index]?.trim() || "";
    return trimmed || undefined;
  }

  return undefined;
}

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

      // Parse EMAIL - Format: EMAIL:value or EMAIL;TYPE=...:value
      if (upperLine.startsWith("EMAIL")) {
        // Extract email value after the last colon
        const colonIndex = line.lastIndexOf(":");
        if (colonIndex >= 0) {
          email = line.substring(colonIndex + 1).trim();
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

  // Split by newline - handle both \n and \r\n, and also handle cases where newline might not be recognized
  const lines = content.split(/\r?\n|\n/).filter((line) => line.trim());
  if (lines.length === 0) return contacts;

  // Parse header row
  const headerLine = lines[0];
  const headers = headerLine
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));

    const firstName =
      getValue(headers, values, [
        "first name",
        "firstname",
        "first_name",
        "fname",
      ]) || "";
    const lastName =
      getValue(headers, values, [
        "last name",
        "lastname",
        "last_name",
        "lname",
      ]) || "";
    const email =
      getValue(headers, values, [
        "email",
        "email address",
        "e-mail",
        "email_address",
      ]) || "";

    // Parse status (convert lowercase to uppercase enum)
    let status: "PERSONAL" | "ENQUIRY" | "CLIENT" | "SUPPLIER" | undefined;
    const statusValue = getValue(headers, values, ["status"]);
    if (statusValue) {
      const upperStatus = statusValue.toUpperCase().trim();
      if (
        upperStatus === "PERSONAL" ||
        upperStatus === "ENQUIRY" ||
        upperStatus === "CLIENT" ||
        upperStatus === "SUPPLIER"
      ) {
        status = upperStatus as "PERSONAL" | "ENQUIRY" | "CLIENT" | "SUPPLIER";
      } else {
        // Map common lowercase values
        if (upperStatus === "CLIENT") status = "CLIENT";
        else if (upperStatus === "SUPPLIER") status = "SUPPLIER";
        else if (upperStatus === "ENQUIRY" || upperStatus === "INQUIRY")
          status = "ENQUIRY";
        else status = "PERSONAL";
      }
    }

    const phoneMobile = getValue(headers, values, [
      "mobile",
      "phone mobile",
      "mobile phone",
      "phone_mobile",
    ]);
    const phoneHome = getValue(headers, values, [
      "home",
      "phone home",
      "home phone",
      "phone_home",
    ]);
    let phoneWork = getValue(headers, values, [
      "work",
      "phone work",
      "work phone",
      "phone_work",
    ]);

    // If Business Phone is provided and Work Phone is empty, use Business Phone
    const businessPhone = getValue(headers, values, [
      "business phone",
      "businessphone",
      "business_phone",
    ]);
    if (businessPhone && !phoneWork) {
      phoneWork = businessPhone;
    }

    const notes = getValue(headers, values, ["notes", "note", "comments"]);
    const personalWebsite = getValue(headers, values, [
      "website",
      "url",
      "personal website",
    ]);
    const companyName = getValue(headers, values, [
      "company",
      "company name",
      "companyname",
      "company_name",
      "business name",
      "businessname",
      "business_name",
      "organization",
      "org",
    ]);
    const companyWebsite = getValue(headers, values, [
      "company website",
      "companywebsite",
      "company_website",
      "business website",
      "businesswebsite",
      "business_website",
    ]);
    const position = getValue(headers, values, [
      "position",
      "title",
      "role",
      "job title",
      "jobtitle",
      "job_title",
      "business position",
      "businessposition",
      "business_position",
    ]);

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
      const session = await getSession();

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

      // Check for existing emails (only non-archived contacts)
      const emails = parsedContacts.map((c) => c.email);
      const existingContacts = await db.contact.findMany({
        where: {
          email: { in: emails },
          userId: session.user.id,
          deletedAt: null,
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
          // Normalize personal website if provided
          let normalizedPersonalWebsite: string | null = null;
          if (contactData.personalWebsite) {
            normalizedPersonalWebsite = contactData.personalWebsite;
            if (!normalizedPersonalWebsite.match(/^https?:\/\//i)) {
              normalizedPersonalWebsite = `https://${normalizedPersonalWebsite}`;
            }
          }

          // Normalize company website if provided
          let normalizedCompanyWebsite: string | null = null;
          if (contactData.companyWebsite) {
            normalizedCompanyWebsite = contactData.companyWebsite;
            if (!normalizedCompanyWebsite.match(/^https?:\/\//i)) {
              normalizedCompanyWebsite = `https://${normalizedCompanyWebsite}`;
            }
          }

          // Build contact data object
          const data: Record<string, unknown> = {
            userId: session.user.id,
            status: contactData.status ?? "PERSONAL",
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            email: contactData.email,
            phoneMobile: contactData.phoneMobile ?? null,
            phoneHome: contactData.phoneHome ?? null,
            phoneWork: contactData.phoneWork ?? null,
            notes: contactData.notes ?? null,
            personalWebsite: normalizedPersonalWebsite,
          };

          // Only include company fields if provided (check for truthy values)
          if (contactData.companyName) {
            data.companyName = contactData.companyName;
          }
          if (normalizedCompanyWebsite) {
            data.companyWebsite = normalizedCompanyWebsite;
          }
          if (contactData.position) {
            data.position = contactData.position;
          }

          const contact = await db.contact.create({
            data: data as Parameters<typeof db.contact.create>[0]["data"],
          });

          createdContacts.push(contact);
        } catch (error) {
          console.error(
            `Failed to import contact ${contactData.firstName} ${contactData.lastName}:`,
            error,
          );
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

      // If all contacts failed to create and none were skipped (meaning it's a real failure, not just skipping existing ones), throw an error
      if (
        successCount === 0 &&
        contactsToCreate.length > 0 &&
        skippedCount === 0
      ) {
        throw new Error(
          `Failed to import contacts. ${errorCount > 0 ? errors.slice(0, 3).join("; ") : "Please check the file format and try again."}`,
        );
      }

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
        // Handle database errors
        else if (
          errorStr.includes("Prisma") ||
          errorStr.includes("Connection timeout") ||
          errorStr.includes("Database")
        ) {
          errorMessage = "Unable to import contacts. Please try again later.";
        }
        // Use the error message if it's already user-friendly
        else if (
          !errorStr.includes("TURBOPACK") &&
          !errorStr.includes("P2025") &&
          !errorStr.includes("P2002")
        ) {
          errorMessage = errorStr;
        }
      }

      throw new Error(errorMessage);
    }
  });
