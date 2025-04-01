const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const CSVProcessor = require('../CSVProcessor');  // Adjust the path accordingly

// Mock Prisma Client
jest.mock('@prisma/client');
const prisma = new PrismaClient();

describe('CSVProcessor', () => {
  let csvProcessor;

  // Mock data
  const mockCSVData = [
    {
      "user_id": "1",
      "ref_id": "0",
      "Submitted at": "2025-02-03 22:03:38",
      "Please enter your telegram or email": "@test",
      "email@email.com": "test@example.com",
      // Add other necessary fields here
    },
    {
      "user_id": "2",
      "ref_id": "1",
      "Submitted at": "2025-02-03 22:05:02",
      "Please enter your telegram or email": "@test2",
      "email@email.com": "test2@example.com",
      // Add other necessary fields here
    }
  ];

  beforeEach(() => {
    // Reset or mock the necessary methods before each test
    prisma.user.create = jest.fn().mockResolvedValue(true);
    prisma.user.update = jest.fn().mockResolvedValue(true);
    
    // Create a new CSVProcessor instance for each test
    csvProcessor = new CSVProcessor('mockFile.csv');
  });

  it('should correctly process CSV and add users to the line', async () => {
    // Mock fs.createReadStream to simulate the CSV data being read
    jest.spyOn(fs, 'createReadStream').mockReturnValueOnce({
      pipe: jest.fn().mockReturnValue({
        on: jest.fn().mockImplementationOnce((event, callback) => {
          if (event === 'data') {
            mockCSVData.forEach(row => callback(row));  // Simulate data rows being passed
          }
          if (event === 'end') {
            callback();  // Simulate the end of the stream
          }
        }),
      }),
    });

    // Call the processCSV method
    await csvProcessor.processCSV();

    // Check that the database insertions and updates were called the correct number of times
    expect(prisma.user.create).toHaveBeenCalledTimes(mockCSVData.length);
    expect(prisma.user.update).toHaveBeenCalledTimes(mockCSVData.length);
  });

  it('should handle the batch processing correctly', async () => {
    // Assuming batch size is 1000, mock batch processing
    const processBatchMock = jest.spyOn(csvProcessor, 'sortAndUpdate').mockResolvedValue(true);

    await csvProcessor.processCSV();

    expect(processBatchMock).toHaveBeenCalled();
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });
});