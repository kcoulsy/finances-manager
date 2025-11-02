import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { createContactAction } from "./create-contact.action";
import { importContactsAction } from "./import-contacts.action";

describe("importContactsAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  describe("CSV Import", () => {
    it("imports contacts from CSV successfully", async () => {
      const csvContent = `First Name,Last Name,Email,Status,Mobile,Company Name,Position
John,Doe,john.doe@example.com,CLIENT,07123 456789,Acme Corp,Director
Jane,Smith,jane.smith@example.com,SUPPLIER,07999 888777,Smith Ltd,Manager`;

      const result = await importContactsAction({
        fileContent: csvContent,
        fileType: "csv",
      });

      expect(result.data?.success).toBe(true);
      expect(result.data?.imported).toBe(2);
      expect(result.data?.skipped).toBe(0);
      expect(result.data?.errors).toBe(0);
      expect(result.data?.toast).toBeDefined();
      expect(result.data?.toast?.type).toBe("success");
      expect(result.data?.toast?.message).toContain("2 contacts");

      // Verify contacts were created
      const contacts = await db.contact.findMany({
        where: {
          userId: testUser.id,
          email: { in: ["john.doe@example.com", "jane.smith@example.com"] },
        },
      });

      expect(contacts.length).toBe(2);
      expect(
        contacts.find((c) => c.email === "john.doe@example.com"),
      ).toBeDefined();
      expect(
        contacts.find((c) => c.email === "jane.smith@example.com"),
      ).toBeDefined();
    });

    it("imports CSV with minimal required fields", async () => {
      const csvContent = `First Name,Last Name,Email
John,Doe,minimal-john@example.com
Jane,Smith,minimal-jane@example.com`;

      const result = await importContactsAction({
        fileContent: csvContent,
        fileType: "csv",
      });

      expect(result.data?.success).toBe(true);
      expect(result.data?.imported).toBe(2);
    });

    it("skips contacts that already exist", async () => {
      // Create existing contact
      await createContactAction({
        firstName: "Existing",
        lastName: "Contact",
        email: "existing@example.com",
        status: "PERSONAL",
      });

      const csvContent = `First Name,Last Name,Email
Existing,Contact,existing@example.com
New,Contact,new@example.com`;

      const result = await importContactsAction({
        fileContent: csvContent,
        fileType: "csv",
      });

      expect(result.data?.success).toBe(true);
      expect(result.data?.imported).toBe(1);
      expect(result.data?.skipped).toBe(1);
      expect(result.data?.toast?.message).toContain("1 contact");
      expect(result.data?.toast?.message).toContain("skipped");
    });

    it("handles CSV with quoted values", async () => {
      const csvContent = `"First Name","Last Name","Email"
"John","Doe","quoted-john.doe@example.com"`;

      const result = await importContactsAction({
        fileContent: csvContent,
        fileType: "csv",
      });

      expect(result.data?.success).toBe(true);
      expect(result.data?.imported).toBe(1);
    });

    it("handles CSV with various column name variations", async () => {
      const csvContent = `first_name,last_name,email_address,phone_mobile,company_name
John,Doe,variations-john@example.com,07123 456789,Acme Corp`;

      const result = await importContactsAction({
        fileContent: csvContent,
        fileType: "csv",
      });

      expect(result.data?.success).toBe(true);
      expect(result.data?.imported).toBe(1);

      const contact = await db.contact.findFirst({
        where: { email: "variations-john@example.com" },
      });

      expect(contact?.firstName).toBe("John");
      expect(contact?.lastName).toBe("Doe");
      expect(contact?.phoneMobile).toBe("07123 456789");
      expect((contact as any)?.companyName).toBe("Acme Corp");
    });
  });

  describe("vCard Import", () => {
    it("imports contacts from vCard successfully", async () => {
      const vcardContent = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
N:Doe;John;;;
EMAIL:john.doe@example.com
TEL;TYPE=CELL:07123 456789
TEL;TYPE=HOME:01234 567890
TEL;TYPE=WORK:020 1234 5678
NOTE:Important client
URL:https://johndoe.com
ORG:Acme Corp
TITLE:Director
END:VCARD

BEGIN:VCARD
VERSION:3.0
FN:Jane Smith
N:Smith;Jane;;;
EMAIL:jane.smith@example.com
TEL;TYPE=MOBILE:07999 888777
END:VCARD`;

      const result = await importContactsAction({
        fileContent: vcardContent,
        fileType: "vcard",
      });

      expect(result.data?.success).toBe(true);
      expect(result.data?.imported).toBe(2);
      expect(result.data?.toast?.type).toBe("success");

      const contacts = await db.contact.findMany({
        where: {
          userId: testUser.id,
          email: { in: ["john.doe@example.com", "jane.smith@example.com"] },
        },
      });

      expect(contacts.length).toBe(2);
      const johnContact = contacts.find(
        (c) => c.email === "john.doe@example.com",
      );
      expect(johnContact?.phoneMobile).toBe("07123 456789");
      expect(johnContact?.phoneHome).toBe("01234 567890");
      expect(johnContact?.phoneWork).toBe("020 1234 5678");
      expect((johnContact as any)?.companyName).toBe("Acme Corp");
      expect((johnContact as any)?.position).toBe("Director");
    });

    it("imports vCard with minimal fields", async () => {
      const vcardContent = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
EMAIL:minimal-vcard-john@example.com
END:VCARD`;

      const result = await importContactsAction({
        fileContent: vcardContent,
        fileType: "vcard",
      });

      expect(result.data?.success).toBe(true);
      expect(result.data?.imported).toBe(1);
    });

    it("handles vCard with FN (Full Name) instead of N", async () => {
      const vcardContent = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
EMAIL:fn-only-vcard-john@example.com
END:VCARD`;

      const result = await importContactsAction({
        fileContent: vcardContent,
        fileType: "vcard",
      });

      expect(result.data?.success).toBe(true);
      expect(result.data?.imported).toBe(1);

      const contact = await db.contact.findFirst({
        where: { email: "fn-only-vcard-john@example.com" },
      });

      expect(contact?.firstName).toBe("John");
      expect(contact?.lastName).toBe("Doe");
    });
  });

  it("validates required fields", async () => {
    const result = await importContactsAction({
      fileContent: "",
      fileType: "csv",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("fileContent");
  });

  it("validates fileType enum", async () => {
    const result = await importContactsAction({
      fileContent: "test",
      fileType: "invalid" as "csv" | "vcard",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
  });

  it("returns user-friendly error when no contacts found in file", async () => {
    const csvContent = `First Name,Last Name,Email`;

    const result = await importContactsAction({
      fileContent: csvContent,
      fileType: "csv",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /no contacts found|file.*empty/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns user-friendly error when all contacts already exist", async () => {
    await createContactAction({
      firstName: "Existing",
      lastName: "Contact",
      email: "existing@example.com",
      status: "PERSONAL",
    });

    const csvContent = `First Name,Last Name,Email
Existing,Contact,existing@example.com`;

    const result = await importContactsAction({
      fileContent: csvContent,
      fileType: "csv",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /all contacts.*exist|already exist/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("throws user-friendly error when user is not authenticated", async () => {
    mockNoAuthSession();

    const csvContent = `First Name,Last Name,Email
John,Doe,unauth-john@example.com`;

    const result = await importContactsAction({
      fileContent: csvContent,
      fileType: "csv",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /need.*logged|unauthorized|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  // Note: Database error handling is tested implicitly through other tests
  // Testing actual database errors would require mocking, which we avoid

  it("handles partial import failures gracefully", async () => {
    // Create a contact that will cause a conflict for one of the imports
    await createContactAction({
      firstName: "Existing",
      lastName: "Contact",
      email: "existing@example.com",
      status: "PERSONAL",
    });

    const csvContent = `First Name,Last Name,Email
Existing,Contact,existing@example.com
New,Contact,new@example.com`;

    const result = await importContactsAction({
      fileContent: csvContent,
      fileType: "csv",
    });

    // Should succeed with skipped count
    expect(result.data?.success).toBe(true);
    expect(result.data?.imported).toBe(1);
    expect(result.data?.skipped).toBe(1);
    expect(result.data?.toast?.message).toContain("1 contact");
    expect(result.data?.toast?.message).toContain("skipped");
  });

  it("returns success toast with proper message for successful import", async () => {
    const csvContent = `First Name,Last Name,Email
John,Doe,toast-john@example.com
Jane,Smith,toast-jane@example.com`;

    const result = await importContactsAction({
      fileContent: csvContent,
      fileType: "csv",
    });

    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.message).toContain("2 contacts");
    expect(result.data?.toast?.description).toContain(
      "2 new contacts have been added",
    );
  });

  it("handles CSV with business phone mapping to work phone", async () => {
    const csvContent = `First Name,Last Name,Email,Business Phone
John,Doe,business-phone-john@example.com,020 1234 5678`;

    const result = await importContactsAction({
      fileContent: csvContent,
      fileType: "csv",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.imported).toBe(1);

    const contact = await db.contact.findFirst({
      where: { email: "business-phone-john@example.com" },
    });

    expect(contact?.phoneWork).toBe("020 1234 5678");
  });

  it("handles CSV with company website", async () => {
    const csvContent = `First Name,Last Name,Email,Company Name,Company Website
John,Doe,company-website-john@example.com,Acme Corp,acmecorp.com`;

    const result = await importContactsAction({
      fileContent: csvContent,
      fileType: "csv",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.imported).toBe(1);

    const contact = await db.contact.findFirst({
      where: { email: "company-website-john@example.com" },
    });

    expect((contact as any)?.companyName).toBe("Acme Corp");
    // Note: Company website normalization might happen in createContactAction,
    // but for imports it uses personalWebsite field
  });
});
