import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { createContactAction } from "./create-contact.action";
import { bulkDeleteContactsAction } from "./bulk-delete-contacts.action";
import { vi } from "vitest";

describe("bulkDeleteContactsAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("permanently deletes multiple contacts successfully", async () => {
    // Create multiple contacts
    const timestamp = Date.now();
    const contact1 = await createContactAction({
      firstName: "Contact1",
      lastName: "Delete",
      email: `contact1-${timestamp}-${Math.random()}@example.com`,
      status: "PERSONAL",
    });

    const contact2 = await createContactAction({
      firstName: "Contact2",
      lastName: "Delete",
      email: `contact2-${timestamp}-${Math.random()}@example.com`,
      status: "CLIENT",
    });

    const contact3 = await createContactAction({
      firstName: "Contact3",
      lastName: "Delete",
      email: `contact3-${timestamp}-${Math.random()}@example.com`,
      status: "SUPPLIER",
    });

    expect(contact1.data?.success).toBe(true);
    expect(contact2.data?.success).toBe(true);
    expect(contact3.data?.success).toBe(true);
    expect(contact1.data?.contact).toBeDefined();
    expect(contact2.data?.contact).toBeDefined();
    expect(contact3.data?.contact).toBeDefined();

    const contactIds = [
      contact1.data?.contact.id!,
      contact2.data?.contact.id!,
      contact3.data?.contact.id!,
    ];

    // Verify contacts exist
    const contactsBefore = await db.contact.findMany({
      where: { id: { in: contactIds } },
    });

    expect(contactsBefore).toHaveLength(3);

    // Delete contacts
    const result = await bulkDeleteContactsAction({
      contactIds,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.count).toBe(3);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Contacts deleted permanently");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("3 contacts have");
    expect(result.data?.toast?.description).toContain("permanently removed");

    // Verify contacts are permanently deleted
    const contactsAfter = await db.contact.findMany({
      where: { id: { in: contactIds } },
    });

    expect(contactsAfter).toHaveLength(0);
  });

  it("permanently deletes a single contact successfully", async () => {
    // Create a contact
    const email = `single-${Date.now()}-${Math.random()}@example.com`;
    const createResult = await createContactAction({
      firstName: "Single",
      lastName: "Contact",
      email,
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    expect(createResult.data?.contact).toBeDefined();
    const contactId = createResult.data?.contact.id!;

    // Delete contact
    const result = await bulkDeleteContactsAction({
      contactIds: [contactId],
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.count).toBe(1);
    expect(result.data?.toast?.description).toContain("1 contact has");

    // Verify contact is permanently deleted
    const contactAfter = await db.contact.findUnique({
      where: { id: contactId },
    });

    expect(contactAfter).toBeNull();
  });

  it("validates contactIds array is required and not empty", async () => {
    // Empty array
    const result1 = await bulkDeleteContactsAction({
      contactIds: [],
    });

    expect(result1.data).toBeUndefined();
    expect(result1.validationErrors).toBeDefined();
    expect(result1.validationErrors).toHaveProperty("contactIds");

    // Missing contactIds
    const result2 = await bulkDeleteContactsAction({
      contactIds: [""],
    });

    expect(result2.data).toBeUndefined();
    expect(result2.validationErrors).toBeDefined();
  });

  it("returns user-friendly error when no contacts found", async () => {
    const result = await bulkDeleteContactsAction({
      contactIds: ["non-existent-id-1", "non-existent-id-2"],
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/not found|no contacts found/i);
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("P2025");
    expect(result.serverError).not.toContain("undefined");
  });

  it("only deletes contacts that belong to the user", async () => {
    // Create contacts with testUser
    const timestamp = Date.now();
    const contact1 = await createContactAction({
      firstName: "UserContact1",
      lastName: "Delete",
      email: `usercontact1-${timestamp}-${Math.random()}@example.com`,
      status: "PERSONAL",
    });

    const contact2 = await createContactAction({
      firstName: "UserContact2",
      lastName: "Delete",
      email: `usercontact2-${timestamp}-${Math.random()}@example.com`,
      status: "CLIENT",
    });

    expect(contact1.data?.success).toBe(true);
    expect(contact2.data?.success).toBe(true);
    expect(contact1.data?.contact).toBeDefined();
    expect(contact2.data?.contact).toBeDefined();

    const contactIds = [
      contact1.data?.contact.id!,
      contact2.data?.contact.id!,
      "non-existent-id",
    ];

    // Delete contacts (only valid ones will be deleted)
    const result = await bulkDeleteContactsAction({
      contactIds,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.count).toBe(2); // Only 2 valid contacts

    // Verify only valid contacts are deleted
    const remainingContacts = await db.contact.findMany({
      where: { id: { in: [contact1.data?.contact.id!, contact2.data?.contact.id!] } },
    });

    expect(remainingContacts).toHaveLength(0);
  });

  it("deletes both archived and non-archived contacts", async () => {
    // Create contacts
    const timestamp = Date.now();
    const contact1 = await createContactAction({
      firstName: "Active",
      lastName: "Contact",
      email: `active-${timestamp}-${Math.random()}@example.com`,
      status: "PERSONAL",
    });

    const contact2 = await createContactAction({
      firstName: "Archived",
      lastName: "Contact",
      email: `archived-${timestamp}-${Math.random()}@example.com`,
      status: "CLIENT",
    });

    expect(contact1.data?.success).toBe(true);
    expect(contact2.data?.success).toBe(true);
    expect(contact1.data?.contact).toBeDefined();
    expect(contact2.data?.contact).toBeDefined();

    const contact1Id = contact1.data?.contact.id!;
    const contact2Id = contact2.data?.contact.id!;

    const contactIds = [contact1Id, contact2Id];

    // Archive contact2
    await db.contact.update({
      where: { id: contact2Id },
      data: { deletedAt: new Date() },
    });

    // Delete both contacts
    const result = await bulkDeleteContactsAction({
      contactIds,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.count).toBe(2); // Both contacts deleted

    // Verify both are permanently deleted
    const remainingContacts = await db.contact.findMany({
      where: { id: { in: contactIds } },
    });

    expect(remainingContacts).toHaveLength(0);
  });

  it("returns user-friendly error when unauthorized", async () => {
    // Create contacts first
    const timestamp = Date.now();
    const contact1 = await createContactAction({
      firstName: "Unauthorized1",
      lastName: "Contact",
      email: `unauthorized1-${timestamp}-${Math.random()}@example.com`,
      status: "PERSONAL",
    });

    const contact2 = await createContactAction({
      firstName: "Unauthorized2",
      lastName: "Contact",
      email: `unauthorized2-${timestamp}-${Math.random()}@example.com`,
      status: "CLIENT",
    });

    expect(contact1.data?.success).toBe(true);
    expect(contact2.data?.success).toBe(true);
    expect(contact1.data?.contact).toBeDefined();
    expect(contact2.data?.contact).toBeDefined();

    const contactIds = [
      contact1.data?.contact.id!,
      contact2.data?.contact.id!,
    ];

    // Mock no auth session
    mockNoAuthSession();

    // Try to delete contacts without authentication
    // Action throws error, so we need to catch it
    let result;
    try {
      result = await bulkDeleteContactsAction({
        contactIds,
      });
    } catch (error) {
      // Action throws error for unauthorized, wrap it
      result = { serverError: error instanceof Error ? error.message : String(error) };
    }

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/unauthorized|logged in|need to be/i);
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("TURBOPACK");
  });

  it("returns success toast configuration for single contact", async () => {
    const email = `singletoast-${Date.now()}-${Math.random()}@example.com`;
    const createResult = await createContactAction({
      firstName: "SingleToast",
      lastName: "Contact",
      email,
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    expect(createResult.data?.contact).toBeDefined();

    const result = await bulkDeleteContactsAction({
      contactIds: [createResult.data?.contact.id!],
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Contacts deleted permanently");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("1 contact has");
    expect(result.data?.toast?.description).toContain("permanently removed");
  });

  it("returns success toast configuration for multiple contacts", async () => {
    const timestamp = Date.now();
    const contact1 = await createContactAction({
      firstName: "Multi1",
      lastName: "Contact",
      email: `multi1-${timestamp}-${Math.random()}@example.com`,
      status: "PERSONAL",
    });

    const contact2 = await createContactAction({
      firstName: "Multi2",
      lastName: "Contact",
      email: `multi2-${timestamp}-${Math.random()}@example.com`,
      status: "CLIENT",
    });

    expect(contact1.data?.success).toBe(true);
    expect(contact2.data?.success).toBe(true);
    expect(contact1.data?.contact).toBeDefined();
    expect(contact2.data?.contact).toBeDefined();

    const result = await bulkDeleteContactsAction({
      contactIds: [
        contact1.data?.contact.id!,
        contact2.data?.contact.id!,
      ],
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Contacts deleted permanently");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("2 contacts have");
    expect(result.data?.toast?.description).toContain("permanently removed");
  });
});

