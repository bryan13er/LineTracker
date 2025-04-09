const { error } = require("console");

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
    // in memory + in database per valid bucket
    this.bucket_counts = new Map();
    this.global_offsets = new Map();
  }

  clear() {
    this.referral_buckets.clear();
    this.referral_buckets.set(0, []);
    this.zeroth_bucket_array = this.referral_buckets.get(0);
    this.zeroth_bucket_array_length = 0;
    this.zeroth_bucket_array_position_map.clear();
    this.needsReSortBuckets.clear();
    this.bucket_counts.clear();
    this.global_offsets = new Map();
  }

  // Mark a bucket as needing re-sort (for when users are added or referrals change)
  markBucketAsUnsorted(referralCount) {
    this.needsReSortBuckets.add(referralCount); // Mark the affected bucket for re-sort
  }

  async getGlobalOffsets() {
    const global_offsets = new Map();
    let bucketCountsMap = new Map();

    try {
      // Use Prisma's groupBy to get counts of users grouped by ref_count
      const bucketCounts = await this.prisma.users.groupBy({
        by: ['ref_count'], // Group by the ref_count column
        _count: {
          ref_count: true, // Count the number of users in each group
        },
      });
  
      // Convert the result into a Map for easy access
      for (const bucket of bucketCounts) {
        bucketCountsMap.set(bucket.ref_count, bucket._count.ref_count);
      }
    } catch (error) {
      console.error('Error fetching global offsets:', error);
      throw error; // Re-throw the error to handle it upstream
    }

    let running_total = 0;

    for (
      let refferal_count = this.max_referral;
      refferal_count > 0;
      refferal_count--
    ) {
      global_offsets.set(refferal_count, running_total);
       // Get counts from the database and in-memory buckets
      const dbCount = bucketCountsMap.get(refferal_count) || 0;
      const inMemoryCount = this.referral_buckets.get(refferal_count)?.size ?? 0;
      // Update running total
      running_total += dbCount + inMemoryCount;
    }

    // need to do the zeroth case;
    global_offsets.set(0, running_total);
    this.global_offsets = global_offsets;
  }

  // Helper method to check if a set is empty
  isEmpty(set) {
    return set.size === 0;
  }

  // Constructor to create a user object
  createUser(user_id, ref_id, submit_time, referrals=0) {
    return {
      user_id: user_id,
      ref_id: ref_id,
      submit_time: new Date(submit_time), // Convert to Date object
      referrals: referrals,
      local_position: null, // Position will be calculated after sorting
      global_position: null, // Global rank will be calculated after sorting
    };
  }

  // update a previous user based on new referral count
  // needs to remove users from old bucket
  // needs to place  users in new bucket
  // if it does not exist make it
  updateUser(user) {

    // means there was some sort of lower case to uppercase issue
    // so we need to check if the user is actually in memory rn
    if(user.referrals === -1){
      const found_user = this.findUser(user.user_id);
      if(found_user){
        user = found_user;
      }else{
        throw new Error(`Invalid ref_count for user ${user.user_id}: ref_count cannot be -1.`);
      }
    }

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

        // if(bucket.size === 0){
        //   // remove empty bucket
        //   this.referral_buckets.delete(user.referrals);
        // }
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

    //TODO: need to be carful that the new user always goes up a group and does not try
    // to set the 0th group i.e. the array group 
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
            dbReferrer.ref_count
          );

          // set to negative 1 to not mess up groups until properly udpated
          // TODO: this update needs to be written to the database
          this.updateUser(referral_user);
          await this.resetDbUser(referral_user);
          // Add the referrer to the line
          
        }
      // If the referrer exists (either in memory or loaded from the database), update them
      } else if (referral_user) {
        try{
          this.updateUser(referral_user);
        } catch (error) {
          console.error('Error updating user:', error.message);
          console.error('Error caused by inserting user:', user.user_id);
        }
      }
    }
    // Mark the zeroth bucket as unsorted
    this.markBucketAsUnsorted(0);
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
    let new_zeroth_bucket = [];
    let new_position_map = new Map();
    let local_position = 0;
    const global_offset = this.global_offsets.get(0);

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
    const global_offset = await this.global_offsets.get(referralCount);

    for (const user of sortedUsers) {
      user.local_position = local_position;
      user.global_position = local_position + global_offset;
      local_position += 1;
    }

    //TODO: need to update in memory bucket to reflect updated users
    this.referral_buckets.get(referralCount)?.clear();
    
    this.referral_buckets.set(
      referralCount,
      new Map(sortedUsers.map(user => [user.user_id, user]))
    );
  }
   
  async sortBucket(referralCount, dbUsers) {
    if (referralCount === 0) {
      const sortedUsers = this.mergeSortedUsers(this.zeroth_bucket_array, dbUsers);
      await this.updateZerothBucketPositions(sortedUsers);
    } else {
      let sortedMemoryUsers = [];

      if(this.referral_buckets.has(referralCount)){
        const users_container = this.referral_buckets.get(referralCount);
        sortedMemoryUsers = Array.from(users_container.values()).sort(
          (a, b) => a.submit_time - b.submit_time,
        );
      }
      
      const sortedUsers = this.mergeSortedUsers(sortedMemoryUsers, dbUsers);
      await this.updateNthBucketPositions(sortedUsers, referralCount)
    }
  }

  convertDbUsersToMemory(dbUsers) {
    if (dbUsers.length === 0) {
      return [];
    }
  
    // Convert database users into memory-compatible user objects
    const dbUsersInMemory = [];
    for (const dbUser of dbUsers) {
      if (this.findUser(dbUser.user_id)) {
        // Skip users already in memory
        continue;
      }
  
      const user = this.createUser(
        dbUser.user_id,
        dbUser.ref_id,
        dbUser.submit_time,
        dbUser.ref_count
      );

      user.referrals = dbUser.ref_count;
      user.local_position = dbUser.local_position;
      user.global_position = dbUser.global_position;
  
      dbUsersInMemory.push(user);
    }
  
    return dbUsersInMemory;
  }

  async getAllDbUsers(sortedReferralCounts){
    // Fetch all relevant users from the database in a single query
    const dbUsers = await this.prisma.users.findMany({
      where: {
        ref_count: { in: sortedReferralCounts }, // Match any referral count in sortedReferralCounts
      },
      orderBy: {
        submit_time: 'asc', // Sort by submission time
      },
    });

    // place users in right bucket
    const dbUsers_buckets = new Map();

    for(const dbUser of dbUsers){
      if(!dbUsers_buckets.has(dbUser.ref_count)){
        dbUsers_buckets.set(dbUser.ref_count, [])
      }
      dbUsers_buckets.get(dbUser.ref_count).push(dbUser);
    }

    const dbUsers_in_memory_buckets = new Map();

    for(const ref_count of dbUsers_buckets.keys()){
      dbUsers_in_memory_buckets.set(ref_count, this.convertDbUsersToMemory(dbUsers_buckets.get(ref_count)||[]));
    }

    return dbUsers_in_memory_buckets;
  }


  // Sort each bucket by submit_time and assign global positions
  async sortAllBuckets() {
    // update global position cache
    
    // TODO: need to pass an empty array instead causes bug if group is undefiend
    if (this.isEmpty(this.needsReSortBuckets)) {
      return null;
    }

    // Process only the buckets that need sorting in descending order of referral count
    const sortedReferralCounts = Array.from(this.needsReSortBuckets).sort(
      (a, b) => b - a
    );

    const db_users = await this.getAllDbUsers(sortedReferralCounts);
    
    const updatedBuckets = new Set(sortedReferralCounts);
    await this.getGlobalOffsets();

    for (const referralCount of sortedReferralCounts) {
      await this.sortBucket(referralCount, db_users.get(referralCount) || []);
      this.needsReSortBuckets.delete(referralCount);
    }

    return updatedBuckets;
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
  
}

module.exports = Line;
