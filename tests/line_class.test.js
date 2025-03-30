const Line = require('../line'); // Import your Line class

describe('Line class', () => {
  let line;

  // Initialize before each test
  beforeEach(() => {
    line = new Line();
  });

  // Test creating users and inserting into the system
  test('should create and insert users correctly', () => {
    const line = new Line();

    // Create users
    const user1 = line.createUser('user1', null, '2025-03-28T12:00:00');
    const user2 = line.createUser('user2', 'user1', '2025-03-28T12:05:00');  // User2 refers to user1
    const user3 = line.createUser('user3', 'user2', '2025-03-28T12:10:00');  // User3 refers to user2
    
    // Insert users
    line.insertUser(user1);  // User1 referred 1 person
    line.insertUser(user2);  // User2 referred 1 person
    line.insertUser(user3);  // User3 referred 0 people

    // Get a copy of the users
    const copiedBuckets = line.getUsers();

    console.log(copiedBuckets)

    // Check the referral count buckets and assert that users are placed correctly
    const bucket0Users = copiedBuckets.get(0);  // Zeroth bucket ( 2 referral)
    const bucket1Users = copiedBuckets.get(1);  // First bucket (1 referral)

    // Assert user3 is in the zeroth bucket (no referrals)
    expect(bucket0Users.has('user3')).toBe(true);
    
    // Assert user1 is in the first bucket (1 referral)
    expect(bucket1Users.has('user1')).toBe(true);
    
    // Assert user2 is in the second bucket (1 referrals)
    expect(bucket1Users.has('user2')).toBe(true);
  
    // Check that the sizes of the buckets are correct
    expect(bucket0Users.size).toBe(1);
    expect(bucket1Users.size).toBe(2);
  });

  test('should make user1 the first in line and user10 the last in line', () => {
    const line = new Line();

    const user1  = line.createUser('user1', null, '2025-03-28T12:00:00');
    const user2  = line.createUser('user2', 'user1', '2025-03-28T12:05:00');  
    const user3  = line.createUser('user3', 'user1', '2025-03-28T12:10:00');  
    const user4  = line.createUser('user4', 'user1', '2025-03-28T12:15:00');  
    const user5  = line.createUser('user5', 'user2', '2025-03-28T12:20:00');  
    const user6  = line.createUser('user6', 'user2', '2025-03-28T12:25:00');  
    const user7  = line.createUser('user7', 'user2', '2025-03-28T12:30:00');  
    const user8  = line.createUser('user8', null, '2025-03-28T12:35:00');  
    const user9  = line.createUser('user9', null, '2025-03-28T12:40:00');  
    const user10 = line.createUser('user10', null, '2025-03-28T12:45:00');  

    line.insertUser(user1); 
    line.insertUser(user2);  
    line.insertUser(user3);  
    line.insertUser(user4);  
    line.insertUser(user5);  
    line.insertUser(user6);  
    line.insertUser(user7); 
    line.insertUser(user8);  
    line.insertUser(user9);  
    line.insertUser(user10); 

    // line.();

    

  });

});