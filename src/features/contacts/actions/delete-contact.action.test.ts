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
      email: "todelete@example.com",
      status: "PERSONAL",
    });

    const contactId = createResult.data?.contact.id!;

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

    // Verify soft delete - contact should still exist but with deletedAt set
    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    expect(contact).toBeDefined();
    expect(contact?.deletedAt).not.toBeNull();
    expect(contact?.deletedAt).toBeInstanceOf(Date);
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
      email: "test@example.com",
      status: "PERSONAL",
    });

    const contactId = createResult.data?.contact.id!;

    // Create another user and try to delete the contact
    const otherUser = await setupTestUserWithSession({
      email: "other@example.com",
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
      email: "test@example.com",
      status: "PERSONAL",
    });

    mockNoAuthSession();

    const result = await deleteContactAction({
      contactId: createResult.data?.contact.id!,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/unauthorized|need.*logged|must.*sign/i);
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns user-friendly error messages for toast display on database errors", async () => {
    const createResult = await createContactAction({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      status: "PERSONAL",
    });

    const contactId = createResult.data?.contact.id!;

    // Mock database error
    vi.spyOn(db.contact, "update").mockRejectedValue(
      new Error("PrismaClientKnownRequestError: P2025")
    );

    const result = await deleteContactAction({
      contactId,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("P2025");
    expect(result.serverError).not.toContain("Database");
    expect(result.serverError?.toLowerCase()).toMatch(/unable|failed|error/i);
  });

  it("returns success toast with proper description", async () => {
    const createResult = await createContactAction({
      firstName: "Toast",
      lastName: "Test",
      email: "toast@example.com",
      status: "PERSONAL",
    });

    const contactId = createResult.data?.contact.id!;

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
      email: "alreadydeleted@example.com",
      status: "PERSONAL",
    });

    const contactId = createResult.data?.contact.id!;

    // Soft delete the contact first
    await db.contact.update({
      where: { id: contactId },
      data: { deletedAt: new Date() },
    });

    // Try to delete again
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
      email: "contact1@example.com",
      status: "PERSONAL",
    });

    const contact2 = await createContactAction({
      firstName: "Contact2",
      lastName: "Test",
      email: "contact2@example.com",
      status: "PERSONAL",
    });

    const result1 = await deleteContactAction({
      contactId: contact1.data?.contact.id!,
    });

    const result2 = await deleteContactAction({
      contactId: contact2.data?.contact.id!,
    });

    expect(result1.data?.success).toBe(true);
    expect(result2.data?.success).toBe(true);

    // Verify both are soft deleted
    const deleted1 = await db.contact.findUnique({
      where: { id: contact1.data?.contact.id! },
    });

    const deleted2 = await db.contact.findUnique({
      where: { id: contact2.data?.contact.id! },
    });

    expect(deleted1?.deletedAt).not.toBeNull();
    expect(deleted2?.deletedAt).not.toBeNull();
  });
});
