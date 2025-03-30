class Line {
  constructor() {
    this.referralBuckets = new Map();  // Map of maps by referral count
  }

  // Function to insert a user into the correct bucket based on their referral count
  insertUser(user) {
    // Determine the referral count from the ref_id (or from the number of referrals, depending on your structure)
    const referralCount = user.ref_id ? user.ref_id.length : 0;  // Adjust this logic as per your data

    // Check if the bucket exists; if not, create it
    if (!this.referralBuckets.has(referralCount)) {
      this.referralBuckets.set(referralCount, []);
    }

    // Add the user to the corresponding referral bucket
    this.referralBuckets.get(referralCount).push(user);
  }

  // Function to sort users within each bucket by submit_time
  sortBucketBySubmitTime() {
    this.referralBuckets.forEach((users, referralCount) => {
      // Sort users by submit_time within the bucket (ascending order)
      users.sort((a, b) => a.submit_time - b.submit_time);
    });
  }

  // Function to update the position and global rank of each user
  updateUserPositionsAndRanks() {
    let cumulativeRank = 1; // Initialize global rank

    this.referralBuckets.forEach((users, referralCount) => {
      users.forEach((user, index) => {
        // Update the local position in the bucket
        user.position = index + 1;  // Position in bucket is 1-based

        // Calculate global rank based on cumulative size of lower buckets
        user.globalRank = cumulativeRank + user.position - 1;

        // Update the cumulative rank (for the next bucket)
        cumulativeRank += users.length;
      });
    });
  }

  // Function to save users to the database
  async saveUsersToDatabase() {
    for (const referralCount in this.referralBuckets) {
      const users = this.referralBuckets[referralCount];

      for (const user of users) {
        await this.saveUserToDatabase(user);
      }
    }
  }

  // Function to save user to the database (using Prisma)
  async saveUserToDatabase(user) {
    await prisma.user.upsert({
      where: { user_id: user.user_id },
      update: {
        ref_id: user.ref_id,
        submit_time: user.submit_time,
        position: user.position,  // Update position relative to the bucket
        global_rank: user.globalRank, // Store the global rank directly
      },
      create: {
        user_id: user.user_id,
        ref_id: user.ref_id,
        submit_time: user.submit_time,
        position: user.position,  // Update position relative to the bucket
        global_rank: user.globalRank, // Store the global rank directly
      }
    });
  }

  // Function to process and insert all users from CSV
  async processCSVData(csvData) {
    // Insert each user into their respective referral bucket
    for (const userData of csvData) {
      const user = {
        user_id: userData.user_id,
        ref_id: userData.ref_id,
        submit_time: new Date(userData.submit_time),
        position: null, // Position will be calculated later
        globalRank: null,  // Global rank will be calculated later
      };
      this.insertUser(user); // Insert the user into the correct referral bucket
    }

    // Sort the users in each bucket by submit_time
    this.sortBucketBySubmitTime();

    // Update positions and global ranks
    this.updateUserPositionsAndRanks();

    // After processing all users, save them to the database
    await this.saveUsersToDatabase();
  }
}

// Example usage:

const line = new Line();
const csvData = [
  {
    user_id: "user123",
    ref_id: "referrer123",  // This can be a string, representing the referral ID
    submit_time: "2025-03-28T05:43:16.146Z",
  },
  {
    user_id: "user124",
    ref_id: "referrer123",  // Same referrer as user123
    submit_time: "2025-03-28T06:00:16.146Z",
  },
  // Add more data as needed
];

line.processCSVData(csvData).then(() => {
  console.log("All users processed and saved to the database!");
});