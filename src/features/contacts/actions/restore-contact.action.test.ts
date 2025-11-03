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
import { restoreContactAction } from "./restore-contact.action";

describe("restoreContactAction", () => {
  let _testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    _testUser = await setupTestUserWithSession();
  });

  it("restores an archived contact successfully", async () => {
    // Create and archive a contact first
    const email = `torestore-${Date.now()}-${Math.random()}@example.com`;
    const createResult = await createContactAction({
      firstName: "ToRestore",
      lastName: "Contact",
      email,
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    expect(createResult.data?.contact).toBeDefined();
    expect(createResult.data?.contact?.id).toBeDefined();
    const contactId = createResult.data?.contact?.id as string;

    // Archive the contact
    await archiveContactAction({ contactId });

    // Verify contact is archived
    const contactBefore = await db.contact.findUnique({
      where: { id: contactId },
    });

    expect(contactBefore).toBeDefined();
    expect(contactBefore?.deletedAt).not.toBeNull();

    // Restore the contact
    const result = await restoreContactAction({
      contactId,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.contact).toBeDefined();
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Contact restored successfully");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("ToRestore Contact");
    expect(result.data?.toast?.description).toContain("restored");

    // Verify contact is restored (deletedAt is null)
    const contactAfter = await db.contact.findUnique({
      where: { id: contactId },
    });

    expect(contactAfter).toBeDefined();
    expect(contactAfter?.deletedAt).toBeNull();
  });

  it("validates contactId is required", async () => {
    const result = await restoreContactAction({
      contactId: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("contactId");
  });

  it("returns user-friendly error when contact not found", async () => {
    const result = await restoreContactAction({
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

  it("returns user-friendly error when contact not archived", async () => {
    // Create a non-archived contact
    const email = `notarchived-${Date.now()}-${Math.random()}@example.com`;
    const createResult = await createContactAction({
      firstName: "NotArchived",
      lastName: "Contact",
      email,
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    expect(createResult.data?.contact).toBeDefined();
    expect(createResult.data?.contact?.id).toBeDefined();
    const contactId = createResult.data?.contact?.id as string;

    // Try to restore a non-archived contact
    const result = await restoreContactAction({
      contactId,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /not found|not archived/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("P2025");
  });

  it("returns user-friendly error when contact belongs to another user", async () => {
    // Create and archive contact with testUser
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
    const contactId = createResult.data?.contact?.id as string;
    await archiveContactAction({ contactId });

    // Switch to another user
    const otherUser = await setupTestUserWithSession();
    mockAuthSession(otherUser);

    // Try to restore contact that belongs to testUser
    const result = await restoreContactAction({
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
    // Create and archive a contact first
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
    const contactId = createResult.data?.contact?.id as string;
    await archiveContactAction({ contactId });

    // Mock no auth session
    mockNoAuthSession();

    // Try to restore contact without authentication
    // Action throws error, so we need to catch it
    let result:
      | Awaited<ReturnType<typeof restoreContactAction>>
      | {
          serverError: string;
        };
    try {
      result = await restoreContactAction({
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
    // Create and archive a contact first
    const email = `testrestore-${Date.now()}-${Math.random()}@example.com`;
    const createResult = await createContactAction({
      firstName: "TestRestore",
      lastName: "Contact",
      email,
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    expect(createResult.data?.contact).toBeDefined();
    expect(createResult.data?.contact?.id).toBeDefined();
    const contactId = createResult.data?.contact?.id as string;
    await archiveContactAction({ contactId });

    const result = await restoreContactAction({
      contactId,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBeDefined();
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.message).toContain("restored");
    expect(result.data?.toast?.description).toContain("TestRestore Contact");
  });
});
