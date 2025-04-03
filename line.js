class Line {
  constructor(prismaInstance) {
    this.prisma = prismaInstance;
    this.referral_buckets = new Map(); // Map of maps by referral count
    this.referral_buckets.set(0, []);
    this.zeroth_bucket_array = this.referral_buckets.get(0);
    this.zeroth_bucket_array_length = 0;
    this.zeroth_bucket_array_position_map = new Map();
    this.needsReSortBuckets = new Set();
    this.max_referral = 0;
  }

  clear() {
    this.referral_buckets.clear();
    this.referral_buckets.set(0, []);
    this.zeroth_bucket_array = this.referral_buckets.get(0);
    this.zeroth_bucket_array_length = 0;
    this.zeroth_bucket_array_position_map.clear();
    this.needsReSortBuckets.clear();
    this.max_referral = 0;
  }

  // Mark a bucket as needing re-sort (for when users are added or referrals change)
  markBucketAsUnsorted(referralCount) {
    this.needsReSortBuckets.add(referralCount); // Mark the affected bucket for re-sort
  }

  async getDatabaseBucketCount(bucket){
    const userCount = await this.prisma.users.count();
    if (userCount === 0) {
      console.log("Database is empty.");
      return 0; // Return 0 if the database is empty
    }

    const groupCount = await this.prisma.users.count({
      where: {
        ref_count: bucket, 
      },
    });

    return groupCount; 
  }

  async getGlobalOffset(bucket_level) {
    let global_offset = 0;

    for (
      let refferal_count = this.max_referral;
      refferal_count > bucket_level;
      refferal_count--
    ) {
      const database_count = await this.getDatabaseBucketCount(refferal_count);
      // Add the number of users in each bucket
      global_offset += this.referral_buckets.get(refferal_count).size + database_count; 
    }

    return global_offset;
  }

  // Helper method to check if a set is empty
  isEmpty(set) {
    return set.size === 0;
  }

  // Constructor to create a user object
  createUser(user_id, ref_id, submit_time) {
    return {
      user_id: user_id,
      ref_id: ref_id,
      submit_time: new Date(submit_time), // Convert to Date object
      referrals: 0,
      local_position: null, // Position will be calculated after sorting
      global_position: null, // Global rank will be calculated after sorting
    };
  }

  // update a previous user based on new referral count
  // needs to remove users from old bucket
  // needs to place  users in new bucket
  // if it does not exist make it
  updateUser(user) {
    // remove user from prev bucket
    if (user.referrals === 0) {
      if(this.zeroth_bucket_array_position_map.has(user.user_id)){
        this.zeroth_bucket_array[
          this.zeroth_bucket_array_position_map.get(user.user_id)
        ] = null;
        this.zeroth_bucket_array_position_map.delete(user.user_id);
      }
    } else {
      if(this.referral_buckets.has(user.referrals)){
        const bucket = this.referral_buckets.get(user.referrals);
        bucket.delete(user.user_id);
      }
    }
    // update old user list as well
    this.markBucketAsUnsorted(user.referrals);

    user.referrals += 1;

    // Update max_referral if needed
    if (user.referrals > this.max_referral) {
      this.max_referral = user.referrals;
    }

    if (!this.referral_buckets.has(user.referrals)) {
      this.referral_buckets.set(user.referrals, new Map());
    }

    this.referral_buckets.get(user.referrals).set(user.user_id, user);
    this.markBucketAsUnsorted(user.referrals);
  }

  async resetDbUser(lineUser){
    await this.prisma.users.update({
      where: { user_id: lineUser.user_id },
      data: { ref_count: -1 },
    });

    lineUser.local_position = null; // Reset local position
    lineUser.global_position = null; // Reset global position
  }


  async insertUser(user) {
    // Add the user to the zeroth bucket
    this.zeroth_bucket_array.push(user);
    this.zeroth_bucket_array_position_map.set(
      user.user_id,
      this.zeroth_bucket_array_length,
    );
    this.zeroth_bucket_array_length += 1;
  
    // Check if the referrer exists in memory
    if (user.ref_id) {
      let referral_user = this.findUser(user.ref_id);
  
      // If the referrer is not in memory, check the database
      if (!referral_user) {
        const dbReferrer = await this.prisma.users.findUnique({
          where: { user_id: user.ref_id },
        });
  
        if (dbReferrer) {
          // Load the referrer into memory
          referral_user = this.createUser(
            dbReferrer.user_id,
            dbReferrer.ref_id,
            dbReferrer.submit_time,
          );

          // set to negative 1 to not mess up groups until properly udpated
          // TODO: this update needs to be written to the database
          await this.resetDbUser(referral_user);
          // Add the referrer to the line
          this.updateUser(referral_user);
        }
      // If the referrer exists (either in memory or loaded from the database), update them
      } else if (referral_user) {
        this.updateUser(referral_user);
      }
    }
    // Mark the zeroth bucket as unsorted
    this.markBucketAsUnsorted(0);
    console.log('WHYYYY');
    console.log(this.needsReSortBuckets);
  }

  // find the user based on user_id
  // returns a user object
  findUser(user_id) {
    // Check in the zeroth bucket
    if (this.zeroth_bucket_array_position_map.has(user_id)) {
      return this.zeroth_bucket_array[
        this.zeroth_bucket_array_position_map.get(user_id)
      ];
    }

    // Iterate through other referral buckets, skipping the zeroth bucket
    for (const [referrals, bucket] of this.referral_buckets) {
      if (referrals === 0) {
        continue; // Skip the zeroth bucket
      }
      if (bucket.has(user_id)) {
        return bucket.get(user_id);
      }
    }
    return null;
  }

  mergeSortedUsers(memoryUsers, dbUsers) {
    const merged = [];
    let i = 0; // Pointer for dbUsers
    let j = 0; // Pointer for memoryUsers
  
    // Merge the two sorted arrays
    while (i < dbUsers.length && j < memoryUsers.length) {
      if(!memoryUsers[j]){
        j++;
        continue;
      }

      if (dbUsers[i].submit_time <= memoryUsers[j].submit_time) {
        merged.push(dbUsers[i]);
        i++;
      } else {
        merged.push(memoryUsers[j]);
        j++;
      }
    }
  
    // Add any remaining users from dbUsers
    while (i < dbUsers.length) {
      merged.push(dbUsers[i]);
      i++;
    }
  
    // Add any remaining users from memoryUsers
    while (j < memoryUsers.length) {
      merged.push(memoryUsers[j]);
      j++;
    }
  
    return merged;
  }

  async updateZerothBucketPositions(sortedUsers){
    console.log(sortedUsers);

    let new_zeroth_bucket = [];
    let new_position_map = new Map();
    let local_position = 0;
    const global_offset = await this.getGlobalOffset(0);

    for (const user of sortedUsers) {
      if (user !== null) {
        user.local_position = local_position;
        user.global_position = local_position + global_offset;
        new_zeroth_bucket.push(user);
        new_position_map.set(user.user_id, local_position);
        local_position += 1;
      }
    }

    this.zeroth_bucket_array = new_zeroth_bucket;
    this.zeroth_bucket_array_position_map = new_position_map
  } 

  async updateNthBucketPositions(sortedUsers, referralCount){
    let local_position = 0;
    const global_offset = await this.getGlobalOffset(referralCount);

    for (const user of sortedUsers) {
      user.local_position = local_position;
      user.global_position = local_position + global_offset;
      local_position += 1;
    }
  }

  async getDBUsersForBucket(referralCount) {
    return await this.prisma.users.findMany({
      where: { ref_count: referralCount },
      orderBy: { submit_time: 'asc' }, // Ensure users are sorted by submit_time
    });
  }

  async getDbUsersArray(referralCount){
    const dbUsers = await this.getDBUsersForBucket(referralCount);

    if(dbUsers.length === 0){
      return [];
    }

    // Convert database users into memory-compatible user objects
    const dbUsersInMemory = dbUsers.map((dbUser) => {
      const user = this.createUser(
        dbUser.user_id,
        dbUser.ref_id,
        dbUser.submit_time,
      );
      user.referrals = dbUser.ref_count;
      user.local_position = dbUser.local_position;
      user.global_position = dbUser.global_position;
      return user;
    })

    return dbUsersInMemory;
  }

  async sortBucket(referralCount) {
    const dbUsers = await this.getDbUsersArray(referralCount);

    if (dbUsers.length > 0){
      console.log('in database');
    }

    if (referralCount === 0) {

      console.log("IN HERE TWICE");
      console.log("in memory:")
      console.log(this.zeroth_bucket_array);
      console.log("in database");
      console.log(dbUsers);
      console.log("DONE HERE");

      const sortedUsers = this.mergeSortedUsers(this.zeroth_bucket_array, dbUsers);
      await this.updateZerothBucketPositions(sortedUsers);
    } else {
      const users_container = this.referral_buckets.get(referralCount);
      const sortedMemoryUsers = Array.from(users_container.values()).sort(
        (a, b) => a.submit_time - b.submit_time,
      );
      const sortedUsers = this.mergeSortedUsers(sortedMemoryUsers, dbUsers);
      await this.updateNthBucketPositions(sortedUsers, referralCount)
    }
  }


  // Sort each bucket by submit_time and assign global positions
  async sortAllBuckets() {
    console.log("NOW");
    console.log(this.needsReSortBuckets);

    // TODO: need to pass an empty array instead causes bug if group is undefiend
    if (this.isEmpty(this.needsReSortBuckets)) {
      console.log("HERE");
      return null;
    }

    // Process only the buckets that need sorting in descending order of referral count
    const sortedReferralCounts = Array.from(this.needsReSortBuckets).sort(
      (a, b) => b - a
    );
    
    const updatedBuckets = new Set(sortedReferralCounts);

    console.log("TEST",updatedBuckets);

    for (const referralCount of sortedReferralCounts) {
      await this.sortBucket(referralCount);
      this.needsReSortBuckets.delete(referralCount);
    }

    return updatedBuckets;
  }

  async sortUserBucket(user) {
    const referralCount = user.referrals;

    if (!this.needsReSortBuckets.has(referralCount)) {
      return;
    }

    await this.sortBucket(referralCount);
    this.needsReSortBuckets.delete(referralCount);
  }

  // TODO: update this and update thee checks
  // Get a copy of all user_ids in the referral_buckets map
  getUsers() {
    const user_ids_in_buckets = new Map();

    for (const [referralCount, users_container] of this.referral_buckets) {
      if (referralCount === 0) {
        // TODO: this is wrong its using the map it should be the array
        user_ids_in_buckets.set(
          referralCount,
          new Set(this.zeroth_bucket_array_position_map.keys()),
        );
      } else {
        user_ids_in_buckets.set(referralCount, new Set(users_container.keys()));
      }
    }

    return user_ids_in_buckets;
  }

  getGroup(group) {
    if (this.referral_buckets.has(group)) {
      if (group === 0) {
        // TODO: not sure if i want get rid of NULLS here or not
        return this.zeroth_bucket_array;
      }
      return Array.from(this.referral_buckets.get(group).values());
    }
    return [];
  }

  // get the users global position
  async getGlobalPosition(user_id) {
    const found_user = this.findUser(user_id);
    if (found_user) {
      await this.sortUserBucket(found_user);
      return found_user.global_position;
    }

    return null;
  }
}

module.exports = Line;
