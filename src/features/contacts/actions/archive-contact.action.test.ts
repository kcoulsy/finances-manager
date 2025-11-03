import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { archiveContactAction } from "./archive-contact.action";
import { createContactAction } from "./create-contact.action";

describe("archiveContactAction", () => {
  let _testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    _testUser = await setupTestUserWithSession();
  });

  it("archives a contact successfully", async () => {
    // Create a contact first
    const email = `toarchive-${Date.now()}-${Math.random()}@example.com`;
    const createResult = await createContactAction({
      firstName: "ToArchive",
      lastName: "Contact",
      email,
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    expect(createResult.data?.contact).toBeDefined();
    expect(createResult.data?.contact?.id).toBeDefined();
    const contactId = createResult.data.contact.id;

    // Verify contact exists and is not archived
    const contactBefore = await db.contact.findUnique({
      where: { id: contactId },
    });

    expect(contactBefore).toBeDefined();
    expect(contactBefore?.deletedAt).toBeNull();

    // Archive the contact
    const result = await archiveContactAction({
      contactId,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.contact).toBeDefined();
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Contact archived successfully");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("ToArchive Contact");
    expect(result.data?.toast?.description).toContain("archived");

    // Verify contact is archived (deletedAt is set)
    const contactAfter = await db.contact.findUnique({
      where: { id: contactId },
    });

    expect(contactAfter).toBeDefined();
    expect(contactAfter?.deletedAt).not.toBeNull();
    expect(contactAfter?.deletedAt).toBeInstanceOf(Date);
  });

  it("validates contactId is required", async () => {
    const result = await archiveContactAction({
      contactId: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("contactId");
  });

  it("returns user-friendly error when contact not found", async () => {
    const result = await archiveContactAction({
      contactId: "non-existent-id",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /not found|could not find|contact.*found/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("P2025");
    expect(result.serverError).not.toContain("undefined");
  });

  it("returns user-friendly error when contact already archived", async () => {
    // Create and archive a contact
    const email = `archived-${Date.now()}-${Math.random()}@example.com`;
    const createResult = await createContactAction({
      firstName: "Archived",
      lastName: "Contact",
      email,
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    expect(createResult.data?.contact).toBeDefined();
    expect(createResult.data?.contact?.id).toBeDefined();
    const contactId = createResult.data.contact.id;

    // Archive it
    await archiveContactAction({ contactId });

    // Try to archive again
    const result = await archiveContactAction({
      contactId,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /not found|already archived/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("P2025");
  });

  it("returns user-friendly error when contact belongs to another user", async () => {
    // Create contact with testUser
    const email = `otheruser-${Date.now()}-${Math.random()}@example.com`;
    const createResult = await createContactAction({
      firstName: "OtherUser",
      lastName: "Contact",
      email,
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    expect(createResult.data?.contact).toBeDefined();
    expect(createResult.data?.contact?.id).toBeDefined();
    const contactId = createResult.data.contact.id;

    // Switch to another user
    const otherUser = await setupTestUserWithSession();
    mockAuthSession(otherUser);

    // Try to archive contact that belongs to testUser
    const result = await archiveContactAction({
      contactId,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /not found|could not find/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("P2025");
  });

  it("returns user-friendly error when unauthorized", async () => {
    // Create a contact first
    const email = `unauthorized-${Date.now()}-${Math.random()}@example.com`;
    const createResult = await createContactAction({
      firstName: "Unauthorized",
      lastName: "Contact",
      email,
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    expect(createResult.data?.contact).toBeDefined();
    expect(createResult.data?.contact?.id).toBeDefined();
    const contactId = createResult.data.contact.id;

    // Mock no auth session
    mockNoAuthSession();

    // Try to archive contact without authentication
    // Action throws error, so we need to catch it
    let result:
      | Awaited<ReturnType<typeof archiveContactAction>>
      | {
          serverError: string;
        };
    try {
      result = await archiveContactAction({
        contactId,
      });
    } catch (error) {
      // Action throws error for unauthorized, wrap it
      result = {
        serverError: error instanceof Error ? error.message : String(error),
      };
    }

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /unauthorized|logged in|need to be/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("TURBOPACK");
  });

  it("returns success toast configuration", async () => {
    // Create a contact first
    const email = `testarchive-${Date.now()}-${Math.random()}@example.com`;
    const createResult = await createContactAction({
      firstName: "TestArchive",
      lastName: "Contact",
      email,
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    expect(createResult.data?.contact).toBeDefined();
    expect(createResult.data?.contact?.id).toBeDefined();
    const contactId = createResult.data.contact.id;

    const result = await archiveContactAction({
      contactId,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBeDefined();
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.message).toContain("archived");
    expect(result.data?.toast?.description).toContain("TestArchive Contact");
  });
});
