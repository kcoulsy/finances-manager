import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  generateUniqueContactEmail,
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { createContactAction } from "./create-contact.action";
import { listContactsAction } from "./list-contacts.action";

describe("listContactsAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("lists contacts successfully", async () => {
    // Create multiple contacts
    await createContactAction({
      firstName: "John",
      lastName: "Doe",
      email: "list-john@example.com",
      status: "PERSONAL",
    });

    await createContactAction({
      firstName: "Jane",
      lastName: "Smith",
      email: "list-jane@example.com",
      status: "CLIENT",
    });

    const result = await listContactsAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.contacts).toBeDefined();
    expect(Array.isArray(result.data?.contacts)).toBe(true);
    expect(result.data?.contacts.length).toBeGreaterThanOrEqual(2);
    expect(result.data?.total).toBeGreaterThanOrEqual(2);
    expect(result.data?.limit).toBe(50); // Default limit
    expect(result.data?.offset).toBe(0); // Default offset
  });

  it("filters contacts by status", async () => {
    await createContactAction({
      firstName: "Personal",
      lastName: "Contact",
      email: "list-status-personal@example.com",
      status: "PERSONAL",
    });

    await createContactAction({
      firstName: "Client",
      lastName: "Contact",
      email: "list-status-client@example.com",
      status: "CLIENT",
    });

    const result = await listContactsAction({
      status: "CLIENT",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.contacts.every((c) => c.status === "CLIENT")).toBe(
      true,
    );
    expect(result.data?.total).toBeGreaterThanOrEqual(1);
  });

  it("filters contacts by engagement", async () => {
    await createContactAction({
      firstName: "Active",
      lastName: "Contact",
      email: "list-engagement-active@example.com",
      status: "CLIENT",
      engagement: "ACTIVE",
    });

    await createContactAction({
      firstName: "Inactive",
      lastName: "Contact",
      email: "list-engagement-inactive@example.com",
      status: "CLIENT",
      engagement: "INACTIVE",
    });

    const result = await listContactsAction({
      engagement: "ACTIVE",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.contacts.every((c) => c.engagement === "ACTIVE")).toBe(
      true,
    );
  });

  it("filters contacts by role", async () => {
    await createContactAction({
      firstName: "Client",
      lastName: "Role",
      email: "list-role-client@example.com",
      status: "CLIENT",
      role: "Client",
    });

    await createContactAction({
      firstName: "Supplier",
      lastName: "Role",
      email: "list-role-supplier@example.com",
      status: "SUPPLIER",
      role: "Supplier",
    });

    const result = await listContactsAction({
      role: "Client",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.contacts.every((c) => c.role === "Client")).toBe(true);
  });

  it("searches contacts by name", async () => {
    await createContactAction({
      firstName: "Searchable",
      lastName: "Contact",
      email: "list-search-searchable@example.com",
      status: "PERSONAL",
    });

    await createContactAction({
      firstName: "Another",
      lastName: "Person",
      email: "list-search-another@example.com",
      status: "PERSONAL",
    });

    const result = await listContactsAction({
      search: "Searchable",
    });

    expect(result.data?.success).toBe(true);
    expect(
      result.data?.contacts.some(
        (c) =>
          c.firstName.includes("Searchable") ||
          c.lastName.includes("Searchable"),
      ),
    ).toBe(true);
  });

  it("searches contacts by email", async () => {
    await createContactAction({
      firstName: "Email",
      lastName: "Search",
      email: "list-email-search@example.com",
      status: "PERSONAL",
    });

    const result = await listContactsAction({
      search: "list-email-search",
    });

    expect(result.data?.success).toBe(true);
    expect(
      result.data?.contacts.some((c) => c.email.includes("list-email-search")),
    ).toBe(true);
  });

  it("applies limit and offset for pagination", async () => {
    // Create multiple contacts
    for (let i = 0; i < 5; i++) {
      await createContactAction({
        firstName: `Contact${i}`,
        lastName: "Test",
        email: `list-pagination-${i}@example.com`,
        status: "PERSONAL",
      });
    }

    const result = await listContactsAction({
      limit: 2,
      offset: 0,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.contacts.length).toBeLessThanOrEqual(2);
    expect(result.data?.limit).toBe(2);
    expect(result.data?.offset).toBe(0);
  });

  it("validates limit range", async () => {
    const result = await listContactsAction({
      limit: 101, // Max is 100
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("limit");
  });

  it("validates offset is non-negative", async () => {
    const result = await listContactsAction({
      offset: -1,
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("offset");
  });

  it("throws user-friendly error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await listContactsAction({});

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /unauthorized|need.*logged|must.*sign/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("does not return deleted contacts", async () => {
    const createResult = await createContactAction({
      firstName: "ToDelete",
      lastName: "Contact",
      email: generateUniqueContactEmail("list-deleted"),
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    const contactId = createResult.data?.contact.id!;
    expect(contactId).toBeDefined();

    // Soft delete the contact
    await db.contact.update({
      where: { id: contactId },
      data: { deletedAt: new Date() },
    });

    const result = await listContactsAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.contacts.some((c) => c.id === contactId)).toBe(false);
  });

  it("only returns contacts for the authenticated user", async () => {
    // Create contacts for testUser
    await createContactAction({
      firstName: "User1",
      lastName: "Contact",
      email: generateUniqueContactEmail("list-user1"),
      status: "PERSONAL",
    });

    // Create another user and their contact
    const otherUser = await setupTestUserWithSession({
      email: generateUniqueContactEmail("list-other-user"),
    });

    await createContactAction({
      firstName: "Other",
      lastName: "User",
      email: generateUniqueContactEmail("list-other-contact"),
      status: "PERSONAL",
    });

    // Switch back to testUser
    mockAuthSession(testUser);

    const result = await listContactsAction({});

    expect(result.data?.success).toBe(true);
    expect(result.data?.contacts.every((c) => c.userId === testUser.id)).toBe(
      true,
    );
  });
});
