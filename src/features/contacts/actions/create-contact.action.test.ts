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
import { vi } from "vitest";

describe("createContactAction", () => {
  let testUser: TestUser;

  setupTestHooks();

  beforeEach(async () => {
    testUser = await setupTestUserWithSession();
  });

  it("creates a contact successfully with minimal data", async () => {
    const result = await createContactAction({
      firstName: "John",
      lastName: "Doe",
      email: "create-minimal-john@example.com",
      status: "PERSONAL",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.contact).toBeDefined();
    expect(result.data?.contact.firstName).toBe("John");
    expect(result.data?.contact.lastName).toBe("Doe");
    expect(result.data?.contact.email).toBe("create-minimal-john@example.com");
    expect(result.data?.contact.status).toBe("PERSONAL");
    expect(result.data?.contact.userId).toBe(testUser.id);
    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Contact created successfully");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("John Doe");

    const contact = await db.contact.findUnique({
      where: { id: result.data?.contact.id },
    });

    expect(contact).toBeDefined();
    expect(contact?.firstName).toBe("John");
    expect(contact?.lastName).toBe("Doe");
    expect(contact?.email).toBe("create-minimal-john@example.com");
  });

  it("creates a contact with all fields", async () => {
    const result = await createContactAction({
      firstName: "Jane",
      lastName: "Smith",
      email: "create-all-fields-jane@example.com",
      status: "CLIENT",
      role: "Client",
      engagement: "ACTIVE",
      phoneMobile: "07123 456789",
      phoneHome: "01234 567890",
      phoneWork: "020 1234 5678",
      notes: "Important client",
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
    expect(result.data?.contact.firstName).toBe("Jane");
    expect(result.data?.contact.phoneMobile).toBe("07123 456789");
    expect(result.data?.contact.companyName).toBe("Smith Corp");
    expect(result.data?.contact.companyWebsite).toBe("https://smithcorp.com");

    const contact = await db.contact.findUnique({
      where: { id: result.data?.contact.id },
    });

    expect(contact?.companyName).toBe("Smith Corp");
    expect(contact?.position).toBe("Director");
  });

  it("normalizes company website by adding https:// if missing", async () => {
    const result = await createContactAction({
      firstName: "Test",
      lastName: "User",
      email: "create-normalize-website@example.com",
      status: "PERSONAL",
      companyWebsite: "example.com",
    });

    expect(result.data?.success).toBe(true);
    expect(result.data?.contact.companyWebsite).toBe("https://example.com");
  });

  it("validates required fields", async () => {
    const result = await createContactAction({
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

  it("validates email format", async () => {
    const result = await createContactAction({
      firstName: "Test",
      lastName: "User",
      email: "invalid-email",
    });

    expect(result.data).toBeUndefined();
    expect(result.validationErrors).toBeDefined();
    expect(result.validationErrors).toHaveProperty("email");
  });

  it("returns user-friendly error when email already exists", async () => {
    // Create first contact
    await createContactAction({
      firstName: "First",
      lastName: "User",
      email: "create-duplicate-1@example.com",
      status: "PERSONAL",
    });

    // Try to create another with same email
    const result = await createContactAction({
      firstName: "Second",
      lastName: "User",
      email: "create-duplicate-1@example.com",
      status: "PERSONAL",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/already exists|email.*exists/i);
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("P2002");
    expect(result.serverError).not.toContain("Unique constraint");
  });

  it("throws user-friendly error when user is not authenticated", async () => {
    mockNoAuthSession();

    const result = await createContactAction({
      firstName: "Test",
      lastName: "User",
      email: "create-unauth-test@example.com",
      status: "PERSONAL",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError?.toLowerCase()).toMatch(/need.*logged|unauthorized|must.*sign/i);
    expect(result.serverError).not.toContain("PrismaClient");
  });

  it("returns user-friendly error messages for toast display on database errors", async () => {
    // Mock database error
    vi.spyOn(db.contact, "create").mockRejectedValue(
      new Error("PrismaClientKnownRequestError: P2002")
    );

    const result = await createContactAction({
      firstName: "Test",
      lastName: "User",
      email: "create-db-error-test@example.com",
      status: "PERSONAL",
    });

    expect(result.serverError).toBeDefined();
    expect(result.serverError).not.toContain("PrismaClient");
    expect(result.serverError).not.toContain("P2002");
    expect(result.serverError).not.toContain("Database");
    // Error message should be user-friendly - either "already exists" or generic failure
    expect(
      result.serverError?.toLowerCase().includes("already exists") ||
      result.serverError?.toLowerCase().includes("failed") ||
      result.serverError?.toLowerCase().includes("unable")
    ).toBe(true);
  });

  it("creates multiple contacts for the same user", async () => {
    const email1 = generateUniqueContactEmail("create-multiple-1");
    const email2 = generateUniqueContactEmail("create-multiple-2");
    
    const contact1 = await createContactAction({
      firstName: "Contact",
      lastName: "One",
      email: email1,
      status: "PERSONAL",
    });

    // Check for errors before asserting success
    if (contact1.serverError) {
      throw new Error(`Contact1 creation failed: ${contact1.serverError}`);
    }

    const contact2 = await createContactAction({
      firstName: "Contact",
      lastName: "Two",
      email: email2,
      status: "CLIENT",
    });

    // Check for errors before asserting success
    if (contact2.serverError) {
      throw new Error(`Contact2 creation failed: ${contact2.serverError}`);
    }

    expect(contact1.data?.success).toBe(true);
    expect(contact2.data?.success).toBe(true);

    const contacts = await db.contact.findMany({
      where: { userId: testUser.id, deletedAt: null },
    });

    expect(contacts.length).toBeGreaterThanOrEqual(2);
    expect(contacts.map((c) => c.email)).toContain(email1);
    expect(contacts.map((c) => c.email)).toContain(email2);
  });

  it("returns success toast with proper description", async () => {
    const result = await createContactAction({
      firstName: "Toast",
      lastName: "Test",
      email: generateUniqueContactEmail("create-toast"),
      status: "PERSONAL",
    });

    // Check for errors before asserting success
    if (result.serverError) {
      throw new Error(`Contact creation failed: ${result.serverError}`);
    }

    expect(result.data?.toast).toBeDefined();
    expect(result.data?.toast?.message).toBe("Contact created successfully");
    expect(result.data?.toast?.type).toBe("success");
    expect(result.data?.toast?.description).toContain("Toast Test");
    expect(result.data?.toast?.description).toContain("added to your contacts");
  });
});
