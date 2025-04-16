const { PrismaClient } = require("@prisma/client");
const CSVProcessor = require("./CSVProcessor");

async function processBackendCsv(filePath) {
  try {
    // Initialize Prisma client
    const prismaInstance = new PrismaClient();

    // Get the maximum ref_count from the database
    const maxRefCount = await prismaInstance.users.aggregate({
      _max: {
        ref_count: true,
      },
    }).then(result => result._max.ref_count || 0);

    console.log(`Max referral count in the database: ${maxRefCount}`);

    // Instantiate CSVProcessor class with max_ref_count
    const csvProcessor = new CSVProcessor(filePath, prismaInstance, maxRefCount);

    // Process the CSV data
    await csvProcessor.processCSV();

    console.log("CSV processing completed successfully.");
  } catch (error) {
    console.error("Error processing CSV file:", error.message);
    throw error; // Re-throw the error to handle it in the endpoint
  }
}

module.exports = { processBackendCsv };