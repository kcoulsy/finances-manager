import { UserRole } from "@/features/auth/constants/roles";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";

/**
 * Mock headers for seed context (better-auth requires headers)
 */
function createMockHeaders(): Headers {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  return headers;
}

/**
 * Seed roles into the database
 */
async function seedRoles() {
  const roles = [UserRole.ADMIN, UserRole.USER, UserRole.MODERATOR];

  for (const roleName of roles) {
    await db.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
      },
    });
  }

  console.log("✓ Roles seeded");
}

/**
 * Seed users using better-auth
 */
async function seedUsers() {
  const users = [
    {
      name: "Admin User",
      email: "admin@admin.com",
      password: "password",
      roles: [UserRole.ADMIN],
    },
    {
      name: "Moderator User",
      email: "mod@mod.com",
      password: "password",
      roles: [UserRole.MODERATOR],
    },
    {
      name: "Regular User",
      email: "user@user.com",
      password: "password",
      roles: [UserRole.USER],
    },
    // Additional users for testing pagination
    {
      name: "John Doe",
      email: "john@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Jane Smith",
      email: "jane@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Bob Johnson",
      email: "bob@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Alice Williams",
      email: "alice@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Charlie Brown",
      email: "charlie@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Diana Prince",
      email: "diana@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Edward Norton",
      email: "edward@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Fiona Apple",
      email: "fiona@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "George Clooney",
      email: "george@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Helen Hunt",
      email: "helen@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Ian McKellen",
      email: "ian@example.com",
      password: "password",
      roles: [UserRole.MODERATOR],
    },
    {
      name: "Julia Roberts",
      email: "julia@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Kevin Spacey",
      email: "kevin@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Linda Hamilton",
      email: "linda@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Michael Jordan",
      email: "michael@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Nancy Drew",
      email: "nancy@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Oliver Twist",
      email: "oliver@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Patricia Johnson",
      email: "patricia@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Quentin Tarantino",
      email: "quentin@example.com",
      password: "password",
      roles: [UserRole.MODERATOR],
    },
    {
      name: "Rachel Green",
      email: "rachel@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
    {
      name: "Steve Jobs",
      email: "steve@example.com",
      password: "password",
      roles: [UserRole.USER],
    },
  ];

  for (const userData of users) {
    try {
      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`⚠ User ${userData.email} already exists, skipping...`);

        // Ensure roles are assigned
        await assignRolesToUser(existingUser.id, userData.roles);
        continue;
      }

      // Create user using better-auth API
      const response = await auth.api.signUpEmail({
        body: {
          name: userData.name,
          email: userData.email,
          password: userData.password,
        },
        headers: createMockHeaders(),
      });

      if (response.user) {
        // Assign roles to the newly created user
        await assignRolesToUser(response.user.id, userData.roles);
        console.log(`✓ User ${userData.email} created successfully`);
      }
    } catch (error) {
      // If user already exists (better-auth throws error), try to assign roles
      if (error instanceof Error && error.message.includes("already exists")) {
        const existingUser = await db.user.findUnique({
          where: { email: userData.email },
        });
        if (existingUser) {
          await assignRolesToUser(existingUser.id, userData.roles);
          console.log(
            `⚠ User ${userData.email} already exists, roles assigned`,
          );
        }
      } else {
        console.error(`✗ Error creating user ${userData.email}:`, error);
      }
    }
  }
}

/**
 * Assign roles to a user
 */
async function assignRolesToUser(userId: string, roleNames: string[]) {
  for (const roleName of roleNames) {
    const role = await db.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      console.error(`✗ Role ${roleName} not found`);
      continue;
    }

    // Check if UserRole already exists
    const existingUserRole = await db.userRole.findFirst({
      where: {
        userId,
        roleId: role.id,
      },
    });

    if (!existingUserRole) {
      await db.userRole.create({
        data: {
          userId,
          roleId: role.id,
        },
      });
    }
  }
}

/**
 * Main seed function
 */
export const userSeed = async () => {
  console.log("Starting user seed...");

  try {
    // First, seed roles
    await seedRoles();

    // Then, seed users
    await seedUsers();

    console.log("✓ User seed completed successfully");
  } catch (error) {
    console.error("✗ Error seeding users:", error);
    throw error;
  }
};
