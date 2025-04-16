const fs = require("fs");
const path = require("path");
const CSVProcessor = require("./CSVProcessor"); // Ensure the path matches your file structure

// Define the path to the CSV file you want to process
const csvFilePath = path.join(__dirname, "../data/sample_data.csv"); // Make sure this file exists

async function getMaxRefCount(prismaInstance) {
  try {
    const result = await prismaInstance.users.aggregate({
      _max: {
        ref_count: true,
      },
    });

    // Return the maximum ref_count or 0 if no users exist
    return result._max.ref_count || 0;
  } catch (error) {
    console.error("Error fetching max ref_count:", error.message);
    return 0; // Fallback to 0 in case of an error
  }
}


// Function to process CSV
async function processCSV() {
  try {
    // intiate prisma class
    prismaInstance = new PrismaClient()
    const max_ref_count = await getMaxRefCount(prismaInstance);

    // Instantiate CSVProcessor class
    const csvProcessor = new CSVProcessor(csvFilePath, max_ref_count);

    // Process the CSV data
    await csvProcessor.processCSV();

    // // Fetch and display the top ten users
    const topTenUsers = await csvProcessor.getTopXUsers();
    console.log("Top 10 Users by Global Position:", topTenUsers);

    console.log("done here");
  } catch (error) {
    console.error("Error processing CSV:", error);
  }
}

// Run the processCSV function
processCSV();
