const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const BackendDatabaseCalls = require('../BackendDatabaseCalls'); // Adjust path if needed

// Initialize Prisma and BackendDatabaseCalls
const prisma = new PrismaClient();
const backendDbCalls = new BackendDatabaseCalls(prisma);


// Top X Users endpoint
router.get('/top-x', async (req, res) => {
  try {
    const userCount = parseInt(req.query.x) || 10;

    // Fetch the top 10 users by global position
    const topXUsers = await backendDbCalls.fetchTopUsersByGlobalPosition(userCount);

    if(topXUsers){
      // Return the top 10 users as JSON
      res.json(topXUsers);
    } else {
      res.json({});
    }
  } catch (error) {
    console.error('Error fetching top 10 users:', error.message);
    res.status(500).json({ error: 'Failed to fetch top 10 users' });
  }
});

router.get('/get-users-count', async (req, res) => {
  try{
    const userCount = await backendDbCalls.countTotalUsers();
    res.json(userCount);
  } catch (error) {
    console.error('Error fetching user count:', error.message);
    res.status(500).json({error: 'Failed fetch user count'});
  }
});

// Get the position in line of a user by their email
router.get('/get-position-by-email', async (req, res) => {
  try {
    const email = req.query.email;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    console.log(`Fetching position for email: ${email}`);

    // Fetch user by email
    const user = await backendDbCalls.fetchUserByEmail(email);

    // Check if user exists
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return the user's position in line
    return res.status(200).json({ position: user.global_position + 1 });
  } catch (error) {
    console.error('Error fetching position by email:', error.message);
    res.status(500).json({ error: 'Failed to fetch position by email' });
  }
});

router.get('/get-position-by-telegram-handle', async (req, res) => {
  try {
    const handle = req.query.telegram_handle;

    // Validate email

    console.log(`Fetching position for email: ${handle}`);

    // Fetch user by email
    const user = await backendDbCalls.fetchUserByTelegramHandle(handle);

    // Check if user exists
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return the user's position in line
    return res.status(200).json({ position: user.global_position + 1 });
  } catch (error) {
    console.error('Error fetching position by handle:', error.message);
    res.status(500).json({ error: 'Failed to fetch position by handle' });
  }
});

router.get('/get-users-by-ref-count', async (req,res) => {
  try{
    const ref_count = parseInt(req.query.ref_count);

    console.log(`fetching users by ref_count: ${ref_count}`);

    const users = await backendDbCalls.fetchUsersByRefCount(ref_count);

    if(users){
      return res.json(users);
    } else{
      return res.json({});
    }

  } catch (error) {
    console.error('Error fetching users by refferal count:', error.message);
    res.status(500).json({ error: 'Failed to fetch users by refferal count' });
  }
});

module.exports = router;