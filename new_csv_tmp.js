const fs = require('fs');
const csvParser = require('csv-parser');
const Line = require('./line'); // Import the Line class

// Create a new Line instance
const line = new Line();

// Function to parse the CSV file and process users
const processCSV = (csvFilePath) => {
  const users = [];

  // Read the CSV file
  fs.createReadStream(csvFilePath)
    .pipe(csvParser())
    .on('data', (row) => {
      const { 'Submission ID': submissionId, 'Respondent ID': respondentId, 'Submitted at': submittedAt, 'ref_id': refId, 'user_id': userId } = row;
      
      // Create a user object
      const user = line.createUser(userId, refId, submittedAt);
      
      // Insert the user into the Line system
      line.insertUser(user);
    })
    .on('end', () => {
      console.log('CSV file successfully processed');

      // After all users are inserted, sort all the users in the line
      line.sortAllBuckets();

      console.log(line.max_referral)
      console.log(line.referral_buckets.get(line.max_referral));
    });
};

// Example usage
const csvFilePath = '/Users/bryan/Desktop/Ryan Project/sample_data.csv';;
processCSV(csvFilePath);