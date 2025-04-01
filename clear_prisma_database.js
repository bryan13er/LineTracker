const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function deleteAllUsers() {
  try {
    const result = await prisma.users.deleteMany(); // Deletes all records in the Users table
    console.log(`Deleted ${result.count} users from the database.`);
  } catch (error) {
    console.error("Error deleting users:", error);
  } finally {
    await prisma.$disconnect(); // Disconnect from the database
  }
}

deleteAllUsers();