const fs = require('fs');
const path = require('path');
const CSVProcessor = require('./CSVProcessor'); // Ensure the path matches your file structure

// Define the path to the CSV file you want to process
const csvFilePath = path.join(__dirname, '/test_data.csv'); // Make sure this file exists

// Function to process CSV
async function processCSV() {
  try {
    // Instantiate CSVProcessor class
    const csvProcessor = new CSVProcessor(csvFilePath);

    // Process the CSV data
    await csvProcessor.processCSV();

    // // Fetch and display the top ten users
    const topTenUsers = await csvProcessor.getTopXUsers();
    console.log('Top 10 Users by Global Position:', topTenUsers);

    console.log('done here');
  } catch (error) {
    console.error('Error processing CSV:', error);
  }
}

// Run the processCSV function
processCSV();