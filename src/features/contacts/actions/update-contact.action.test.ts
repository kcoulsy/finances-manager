import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/features/shared/lib/db/client";
import {
  mockAuthSession,
  mockNoAuthSession,
  setupTestHooks,
  setupTestUserWithSession,
  type TestUser,
} from "@/features/shared/testing/helpers";
import { createContactAction } from "./create-contact.action";
import { updateContactAction } from "./update-contact.action";

describe("updateContactAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("updates a contact successfully", async () => {
    // Create a contact first
    const createResult = await createContactAction({
      firstName: "Original",
      lastName: "Name",
      email: "original@example.com",
      status: "PERSONAL",
    });

    const contactId = createResult.data?.contact.id!;

    // Update the contact
    const result = await updateContactAction({
      contactId,
      firstName: "Updated",
      lastName: "Name",
      email: "updated@example.com",
      status: "CLIENT",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.contact).toBeDefined();
    expect(result.data?.contact.firstName).toBe("Updated");
    expect(result.data?.contact.email).toBe("updated@example.com");
    expect(result.data?.contact.status).toBe("CLIENT");
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Contact updated successfully");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("Updated Name");

    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    expect(contact?.firstName).toBe("Updated");
    expect(contact?.email).toBe("updated@example.com");
  });

  it("updates contact with all fields", async () => {
    const createResult = await createContactAction({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      status: "PERSONAL",
    });

    const contactId = createResult.data?.contact.id!;

    const result = await updateContactAction({
      contactId,
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      status: "CLIENT",
      role: "Client",
      engagement: "ACTIVE",
      phoneMobile: "07123 456789",
      phoneHome: "01234 567890",
      phoneWork: "020 1234 5678",
      notes: "Updated notes",
      personalWebsite: "https://janesmith.com",
      linkedinUrl: "https://linkedin.com/in/janesmith",
      twitterHandle: "@janesmith",
      facebookUrl: "https://facebook.com/janesmith",
      instagramHandle: "@janesmith",
      companyName: "Smith Corp",
      companyWebsite: "https://smithcorp.com",
      vatNumber: "GB123456789",
      registrationNumber: "12345678",
      accountsEmail: "accounts@smithcorp.com",
      position: "Director",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.contact.companyName).toBe("Smith Corp");
    expect(result.data?.contact.position).toBe("Director");

    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });

    expect(contact?.phoneMobile).toBe("07123 456789");
    expect(contact?.companyName).toBe("Smith Corp");
  });

  it("normalizes company website by adding https:// if missing", async () => {
    const createResult = await createContactAction({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      status: "PERSONAL",
    });

    const contactId = createResult.data?.contact.id!;

    const result = await updateContactAction({
      contactId,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      status: "PERSONAL",
      companyWebsite: "example.com",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.contact.companyWebsite).toBe("https://example.com");
  });

  it("validates required fields", async () => {
    const createResult = await createContactAction({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      status: "PERSONAL",
    });

    const contactId = createResult.data?.contact.id!;

    const result = await updateContactAction({
      contactId,
      firstName: "",
      lastName: "",
      email: "",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("firstName");
    expect(result.validationErrors).toHaveProperty("lastName");
    expect(result.validationErrors).toHaveProperty("email");
  });

  it("validates contactId is required", async () => {
    const result = await updateContactAction({
      contactId: "",
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("contactId");
  });

  it("returns user-friendly error when contact not found", async () => {
    const result = await updateContactAction({
      contactId: "non-existent-id",
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      status: "PERSONAL",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /not found|could not find|contact.*found/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("P2025");
  });

  it("returns user-friendly error when email already exists for another contact", async () => {
    // Create two contacts
    const contact1 = await createContactAction({
      firstName: "First",
      lastName: "User",
      email: "first@example.com",
      status: "PERSONAL",
    });

    await createContactAction({
      firstName: "Second",
      lastName: "User",
      email: "second@example.com",
      status: "PERSONAL",
    });

    const contactId = contact1.data?.contact.id!;

    // Try to update first contact with second contact's email
    const result = await updateContactAction({
      contactId,
      firstName: "First",
      lastName: "User",
      email: "second@example.com",
      status: "PERSONAL",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /already exists|email.*exists/i,
    );
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("P2002");
  });

  it("throws user-friendly error when user is not authenticated", async () => {
    const createResult = await createContactAction({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      status: "PERSONAL",
    });

    mockNoAuthSession();

    const result = await updateContactAction({
      contactId: createResult.data?.contact.id!,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      status: "PERSONAL",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(
      /unauthorized|need.*logged|must.*sign/i,
    );
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
      new Error("PrismaClientKnownRequestError: P2025"),
    );

    const result = await updateContactAction({
      contactId,
      firstName: "Updated",
      lastName: "User",
      email: "updated@example.com",
      status: "PERSONAL",
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

    const result = await updateContactAction({
      contactId,
      firstName: "Updated",
      lastName: "Toast",
      email: "updated@example.com",
      status: "CLIENT",
    });

    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Contact updated successfully");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("Updated Toast");
    expect(result.data?.toast?.description).toContain("has been updated");
  });
});
