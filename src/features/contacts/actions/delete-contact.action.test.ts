import { beforeEach, describe, expect, it } from "vitest";
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
import { deleteContactAction } from "./delete-contact.action";
import { vi } from "vitest";

describe("deleteContactAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("deletes a contact successfully with soft delete", async () => {
    // Create a contact first
    const createResult = await createContactAction({
      firstName: "ToDelete",
      lastName: "Contact",
      email: "delete-soft-delete-test@example.com",
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    const contactId = createResult.data?.contact.id!;
    expect(contactId).toBeDefined();

    // Delete the contact
    const result = await deleteContactAction({
      contactId,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.message).toBe("Contact deleted successfully");
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Contact deleted successfully");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("ToDelete Contact");

    // Verify permanent delete - contact should not exist
    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    expect(contact).toBeNull();
  });

  it("validates contactId is required", async () => {
    const result = await deleteContactAction({
      contactId: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("contactId");
  });

  it("returns user-friendly error when contact not found", async () => {
    const result = await deleteContactAction({
      contactId: "non-existent-id",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/not found|could not find|contact.*found/i);
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("P2025");
    expect(result.serverError).not.toContain("undefined");
  });

  it("returns user-friendly error when contact belongs to another user", async () => {
    // Create contact with testUser
    const createResult = await createContactAction({
      firstName: "Test",
      lastName: "User",
      email: "delete-other-user-1@example.com",
      status: "PERSONAL",
    });

    const contactId = createResult.data?.contact.id!;

    // Create another user and try to delete the contact
    const otherUser = await setupTestUserWithSession({
      email: "delete-other-user-2@example.com",
    });

    mockAuthSession(otherUser);

    const result = await deleteContactAction({
      contactId,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/not found|could not find/i);
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("throws user-friendly error when user is not authenticated", async () => {
    const createResult = await createContactAction({
      firstName: "Test",
      lastName: "User",
      email: "delete-unauth-test@example.com",
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    const contactId = createResult.data?.contact.id!;
    expect(contactId).toBeDefined();

    mockNoAuthSession();

    const result = await deleteContactAction({
      contactId,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/unauthorized|need.*logged|must.*sign/i);
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns user-friendly error messages for toast display on database errors", async () => {
    const createResult = await createContactAction({
      firstName: "Test",
      lastName: "User",
      email: "delete-db-error-test@example.com",
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    const contactId = createResult.data?.contact.id!;
    expect(contactId).toBeDefined();

    // Mock database error on delete
    vi.spyOn(db.contact, "delete").mockRejectedValue(
      new Error("PrismaClientKnownRequestError: P2025")
    );

    const result = await deleteContactAction({
      contactId,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("P2025");
    expect(result.serverError).not.toContain("Database");
    // Error message should be user-friendly (e.g., "Contact not found." or generic failure)
    expect(
      result.serverError?.toLowerCase().includes("contact not found") ||
      result.serverError?.toLowerCase().includes("unable") ||
      result.serverError?.toLowerCase().includes("failed") ||
      result.serverError?.toLowerCase().includes("error")
    ).toBe(true);
  });

  it("returns success toast with proper description", async () => {
    const createResult = await createContactAction({
      firstName: "Toast",
      lastName: "Test",
      email: generateUniqueContactEmail("delete-toast"),
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    const contactId = createResult.data?.contact.id!;
    expect(contactId).toBeDefined();

    const result = await deleteContactAction({
      contactId,
    });

    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Contact deleted successfully");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("Toast Test");
    expect(result.data?.toast?.description).toContain("has been deleted");
  });

  it("does not delete already deleted contacts", async () => {
    const createResult = await createContactAction({
      firstName: "AlreadyDeleted",
      lastName: "Contact",
      email: generateUniqueContactEmail("delete-already-deleted"),
      status: "PERSONAL",
    });

    expect(createResult.data?.success).toBe(true);
    const contactId = createResult.data?.contact.id!;
    expect(contactId).toBeDefined();

    // Delete the contact first (permanent delete)
    const deleteResult = await deleteContactAction({
      contactId,
    });

    expect(deleteResult.data?.success).toBe(true);

    // Try to delete again - should fail because contact doesn't exist
    const result = await deleteContactAction({
      contactId,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/not found|could not find/i);
  });

  it("deletes multiple contacts independently", async () => {
    const contact1 = await createContactAction({
      firstName: "Contact1",
      lastName: "Test",
      email: generateUniqueContactEmail("delete-multiple-1"),
      status: "PERSONAL",
    });

    const contact2 = await createContactAction({
      firstName: "Contact2",
      lastName: "Test",
      email: generateUniqueContactEmail("delete-multiple-2"),
      status: "PERSONAL",
    });

    expect(contact1.data?.success).toBe(true);
    expect(contact2.data?.success).toBe(true);
    const contact1Id = contact1.data?.contact.id!;
    const contact2Id = contact2.data?.contact.id!;
    expect(contact1Id).toBeDefined();
    expect(contact2Id).toBeDefined();

    const result1 = await deleteContactAction({
      contactId: contact1Id,
    });

    const result2 = await deleteContactAction({
      contactId: contact2Id,
    });

    expect(result1.data?.success).toBe(true);
    expect(result2.data?.success).toBe(true);

    // Verify both are permanently deleted
    const deleted1 = await db.contact.findUnique({
      where: { id: contact1Id },
    });

    const deleted2 = await db.contact.findUnique({
      where: { id: contact2Id },
    });

    expect(deleted1).toBeNull();
    expect(deleted2).toBeNull();
  });
});
