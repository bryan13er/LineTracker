const Line = require("../Line"); // Import your Line class

describe("Line class", () => {
  let line;

  // Initialize before each test
  beforeEach(() => {
    line = new Line();
  });

  // Test creating users and inserting into the system
  test("should create and insert users correctly", () => {
    const user1 = line.createUser("user1", null, "2025-03-01T12:00:00Z");
    const user2 = line.createUser("user2", "user1", "2025-03-01T13:00:00Z");
    const user3 = line.createUser("user3", "user1", "2025-03-01T14:00:00Z");

    line.insertUser(user1);
    line.insertUser(user2);
    line.insertUser(user3);

    const users = line.getUsers();
    expect(users.length).toBe(3);
    expect(users[0].user_id).toBe("user1");
    expect(users[1].user_id).toBe("user2");
    expect(users[2].user_id).toBe("user3");
    expect(users[1].referrals).toBe(0); // user2 referrals count
    expect(users[2].referrals).toBe(0); // user3 referrals count
  });

  // Test updating user referrals
  test("should update referrals and move users to new bucket", () => {
    const user1 = line.createUser("user1", null, "2025-03-01T12:00:00Z");
    const user2 = line.createUser("user2", "user1", "2025-03-01T13:00:00Z");
    const user3 = line.createUser("user3", "user1", "2025-03-01T14:00:00Z");

    line.insertUser(user1);
    line.insertUser(user2);
    line.insertUser(user3);

    // At this point, user2 and user3 have 0 referrals, so they are in the zeroth bucket
    expect(line.referralBuckets.get(0).size).toBe(3); // All users should be in the zeroth bucket initially

    line.updateUser(user1); // Update user1 to increase their referral count

    // After updating user1's referral count, users should move to the 1 referral bucket
    expect(line.referralBuckets.get(1).size).toBe(3); // All users should now be in the referral count of 1 bucket
  });

  // Test finding a user by ID
  test("should find user by ID", () => {
    const user1 = line.createUser("user1", null, "2025-03-01T12:00:00Z");
    const user2 = line.createUser("user2", "user1", "2025-03-01T13:00:00Z");

    line.insertUser(user1);
    line.insertUser(user2);

    const foundUser = line.findUser("user2");
    expect(foundUser).toBeDefined();
    expect(foundUser.user_id).toBe("user2");
  });

  // Test if user is correctly removed from a bucket when their referral count increases
  test("should remove user from old bucket when referral count increases", () => {
    const user1 = line.createUser("user1", null, "2025-03-01T12:00:00Z");
    const user2 = line.createUser("user2", "user1", "2025-03-01T13:00:00Z");

    line.insertUser(user1);
    line.insertUser(user2);

    const zerothBucketSizeBefore = line.referralBuckets.get(0).size;

    // Update user1's referral count
    line.updateUser(user1);

    const zerothBucketSizeAfter = line.referralBuckets.get(0).size;

    expect(zerothBucketSizeBefore).toBeGreaterThan(zerothBucketSizeAfter); // The zeroth bucket should now have fewer users after the update
  });

  //   // Test that referral buckets are sorted by submission time
  //   test('should sort users in a bucket by submit_time', () => {
  //     const user1 = line.createUser('user1', null, '2025-03-01T12:00:00Z');
  //     const user2 = line.createUser('user2', 'user1', '2025-03-01T13:00:00Z');
  //     const user3 = line.createUser('user3', 'user1', '2025-03-01T14:00:00Z');

  //     line.insertUser(user1);
  //     line.insertUser(user2);
  //     line.insertUser(user3);

  //     // Check initial order in the zeroth bucket (should be the order they were inserted in)
  //     const usersBeforeSort = Array.from(line.referralBuckets.get(0).values());
  //     expect(usersBeforeSort[0].user_id).toBe('user1');
  //     expect(usersBeforeSort[1].user_id).toBe('user2');
  //     expect(usersBeforeSort[2].user_id).toBe('user3');

  //     // Now, sort the users by submit_time (we will have to implement the sort function)
  //     line.sortBucketBySubmitTime();

  //     const usersAfterSort = Array.from(line.referralBuckets.get(0).values());
  //     expect(usersAfterSort[0].user_id).toBe('user1');
  //     expect(usersAfterSort[1].user_id).toBe('user2');
  //     expect(usersAfterSort[2].user_id).toBe('user3');
  //   });
});
