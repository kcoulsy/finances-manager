import { userSeed } from "./seeds/user.seed";

async function main() {
  console.log("🌱 Starting database seed...\n");

  try {
    await userSeed();

    console.log("\n✅ Database seed completed successfully!");
  } catch (error) {
    console.error("\n❌ Error seeding database:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Prisma will disconnect automatically
  });
