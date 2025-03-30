class Line {
  constructor() {
    this.referral_buckets = new Map();  // Map of maps by referral count
    this.referral_buckets.set(0, []);

    this.zeroth_bucket_array = this.referral_buckets.get(0);
    this.zeroth_bucket_array_length = 0;
    this.zeroth_bucket_array_position_map = new Map();

    this.needsReSortBuckets = new Set();
  } 
  
  // Mark a bucket as needing re-sort (for when users are added or referrals change)
  markBucketAsUnsorted(referralCount) {
    this.needsReSortBuckets.add(referralCount); // Mark the affected bucket for re-sort
  }

  getGlobalOffset(bucket_level){
    global_offset = 0;

    const sortedReferralCounts = Array.from(this.referral_buckets.keys()).sort((a, b) => b - a);
    for (const referralCount of sortedReferralCounts) {
      if(referralCount == bucket_level){
        break;
      }

      global_offset += this.referral_buckets.get(referralCount).size
    }

    return global_offset;
  }
  
  // Constructor to create a user object
  createUser(user_id, ref_id, submit_time) {
    return {
      user_id:     user_id,
      ref_id:      ref_id,
      submit_time: new Date(submit_time),  // Convert to Date object
      referrals:      0,
      local_position:    null,  // Position will be calculated after sorting
      global_position:  null,  // Global rank will be calculated after sorting
    };
  }

  // update a previous user based on new referral count
  // needs to remove users from old bucket 
  // needs to place  users in new bucket 
  // if it does not exist make it
  updateUser(user) {
    // remove user from prev bucket
    if (user.referrals === 0){
      this.zeroth_bucket_array[this.zeroth_bucket_array_position_map.get(user.user_id)] = null;
      this.zeroth_bucket_array_position_map.delete(user.user_id);
    }else{
      const bucket = this.referral_buckets.get(user.referrals);
      bucket.delete(user.user_id);
    }
    // update old user list as well
    this.markBucketAsUnsorted(user.referrals);

    user.referrals += 1;

    if (!this.referral_buckets.has(user.referrals)) {
      this.referral_buckets.set(user.referrals, new Map());
    }

    this.referral_buckets.get(user.referrals).set(user.user_id, user);
    this.markBucketAsUnsorted(user.referrals);
  }

  // insert new user
  // update referal count for another user
  insertUser(user) {
    this.zeroth_bucket_array.push(user);
    this.zeroth_bucket_array_position_map.set(user.user_id, this.zeroth_bucket_array_length);
    this.zeroth_bucket_array_length += 1

    // update referrer
    if(user.ref_id){
      const referral_user = this.findUser(user.ref_id)
      if(referral_user){
        this.updateUser(referral_user);
      }
    }
    this.markBucketAsUnsorted(0);
  }

  // find the user based on user_id
  // returns a user object
  findUser(user_id){
    for (const [referrals, bucket] of this.referral_buckets) {
      if(referrals === 0){
        if (this.zeroth_bucket_array_position_map.has(user_id)){
          return this.zeroth_bucket_array[this.zeroth_bucket_array_position_map.get(user_id)];
        }
      }else{
        if (bucket.has(user_id)){
          return bucket.get(user_id);
        }
      }
    }
    return null;
  }

  sortBucket(referralCount){
    if (referralCount === 0) {
      // Zeroth bucket is already sorted due to submission order
      const global_offset = this.getGlobalOffset(referralCount);
      let local_position = 0;
      
      for (const user of this.zeroth_bucket_array) {
        if (user !== null) {  // Skip removed users (null entries)
          user.local_position  = local_position++;
          user.global_position = local_position + global_offset;
        }
      }

    }else{
      const global_offset = this.getGlobalOffset(referralCount);
      const users_container = this.referral_buckets.get(referralCount);

      // Sort users within the bucket by submit_time (ascending)
      const sortedUsers = Array.from(users_container.values()).sort((a, b) => a.submit_time - b.submit_time);

      // Assign global positions
      let local_position = 0;
      for (const user of sortedUsers) {
        user.local_position  = local_position++;
        user.global_position = local_position + global_offset;
      }
    }
  }

  // Sort each bucket by submit_time and assign global positions
  sortAllBuckets() {
    if(this.needsReSortBuckets.size === 0){
      return;
    }

    // Process referral buckets in descending order of referral count
    const sortedReferralCounts = Array.from(this.referral_buckets.keys()).sort((a, b) => b - a);

    for (const referralCount of sortedReferralCounts) {
      if (!this.needsReSortBuckets.has(referralCount)) {
        continue; // Skip this bucket if no re-sort is needed
      }
      this.sortBucket(referralCount);
      this.needsReSortBuckets.delete(referralCount);
    }
  }

  // TODO only sort user bucket
  sortUserBucket(user){
    const referralCount = user.referrals

    if (!this.needsReSortBuckets.has(referralCount)) {
      return; 
    }

    this.sortBucket(referralCount);
    this.needsReSortBuckets.delete(referralCount);
  }

  // Get a copy of all user_ids in the referral_buckets map
  getUsers() {
    const user_ids_in_buckets = new Map();
    
    for (const [referralCount, users_container] of this.referral_buckets) {
      if (referralCount === 0) {
        user_ids_in_buckets.set(referralCount, new Set(this.zeroth_bucket_array_position_map.keys()));
      } else {
        user_ids_in_buckets.set(referralCount, new Set(users_container.keys()));
      }
    }

    return user_ids_in_buckets;
  }

  // get the users global position 
  getGlobalPosition(user_id){
    const found_user = this.findUser(user_id)
    if(found_user){
      this.sortUserBucket(found_user);
      return found_user.global_position
    }

    return null;
  }

}



module.exports = Line;