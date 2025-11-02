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
import { getContactAction } from "./get-contact.action";
import { vi } from "vitest";

describe("getContactAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("gets a contact successfully", async () => {
    // Create a contact first
    const createResult = await createContactAction({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      status: "PERSONAL",
    });

    const contactId = createResult.data?.contact.id!;

    // Get the contact
    const result = await getContactAction({
      contactId,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.contact).toBeDefined();
    expect(result.data?.contact.id).toBe(contactId);
    expect(result.data?.contact.firstName).toBe("John");
    expect(result.data?.contact.lastName).toBe("Doe");
    expect(result.data?.contact.email).toBe("john.doe@example.com");
    expect(result.data?.contact.userId).toBe(testUser.id);
  });

  it("gets a contact with all fields", async () => {
    const createResult = await createContactAction({
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      status: "CLIENT",
      role: "Client",
      engagement: "ACTIVE",
      phoneMobile: "07123 456789",
      companyName: "Smith Corp",
      position: "Director",
    });

    const contactId = createResult.data?.contact.id!;

    const result = await getContactAction({
      contactId,
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.contact.phoneMobile).toBe("07123 456789");
    expect(result.data?.contact.companyName).toBe("Smith Corp");
    expect(result.data?.contact.position).toBe("Director");
  });

  it("validates contactId is required", async () => {
    const result = await getContactAction({
      contactId: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("contactId");
  });

  it("returns user-friendly error when contact not found", async () => {
    const result = await getContactAction({
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

    // Create another user and try to access the contact
    const otherUser = await setupTestUserWithSession({
      email: "other@example.com",
    });

    mockAuthSession(otherUser);

    const result = await getContactAction({
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

    const result = await getContactAction({
      contactId: createResult.data?.contact.id!,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/unauthorized|need.*logged|must.*sign/i);
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns user-friendly error messages for toast display on database errors", async () => {
    // Mock database error
    vi.spyOn(db.contact, "findFirst").mockRejectedValue(
      new Error("PrismaClientKnownRequestError: Connection timeout")
    );

    const result = await getContactAction({
      contactId: "test-id",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("Connection timeout");
    expect(result.serverError).not.toContain("Database");
    expect(result.serverError?.toLowerCase()).toMatch(/unable|failed|error|fetch/i);
  });

  it("does not return deleted contacts", async () => {
    const createResult = await createContactAction({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      status: "PERSONAL",
    });

    const contactId = createResult.data?.contact.id!;

    // Soft delete the contact
    await db.contact.update({
      where: { id: contactId },
      data: { deletedAt: new Date() },
    });

    const result = await getContactAction({
      contactId,
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/not found|could not find/i);
  });
});
