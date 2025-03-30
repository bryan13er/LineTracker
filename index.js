// Import Prisma Client
const { PrismaClient } = require('@prisma/client');

// Instantiate Prisma Client
const prisma = new PrismaClient();

// Function to insert a new user
async function createUser() {
  try {
    const newUser = await prisma.user.create({
      data: {
        user_id: 'user12345',
        ref_id: 'referrer12345',
        submit_time: new Date(),
        telegram_handle: 'telegram_handle12345',
        email: 'user12345@example.com',
      },
    });

    console.log('New user created:', newUser);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Call the function
createUser();

// Function to fetch all users
async function fetchUsers() {
    try {
        const users = await prisma.user.findMany();
        console.log('Users:', users);
    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        await prisma.$disconnect();
    }
}
  
// Call the function
fetchUsers();