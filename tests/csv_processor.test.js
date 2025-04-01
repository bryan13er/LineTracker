jest.mock("@prisma/client");
const { PrismaClient } = require("@prisma/client");
const Line = require("../line");
const CSVProcessor = require("../CSVProcessor");

jest.mock("../line");

describe("CSVProcessor", () => {
  let mockPrisma;
  let mockLine;
  let csvProcessor;

  beforeEach(() => {
    // Mock PrismaClient
    mockPrisma = {
      users: {
        create: jest.fn(),
        update: jest.fn((args) => args), // Mock update to return the input args
      },
      $transaction: jest.fn((operations) => Promise.resolve(operations)), // Mock $transaction
    };
    PrismaClient.mockImplementation(() => mockPrisma);
  
    // Mock Line class
    mockLine = {
      createUser: jest.fn(),
      insertUser: jest.fn(),
      sortAllBuckets: jest.fn().mockReturnValue([]),
      getGroup: jest.fn().mockReturnValue([]),
      needsReSortBuckets: new Set(),
    };
    Line.mockImplementation(() => mockLine);
  
    // Create an instance of CSVProcessor with the mocked PrismaClient
    csvProcessor = new CSVProcessor("test.csv", mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("updateDatabaseBatchUsersPosition should call users.update for each user", async () => {
    // Mock user data
    const mockUsers = [
      { user_id: "1", referrals: 10, local_position: 1, global_position: 5 },
      { user_id: "2", referrals: 20, local_position: 2, global_position: 10 },
    ];

    // Call the method
    await csvProcessor.updateDatabaseBatchUsersPosition(mockUsers);

    // Assertions
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          where: { user_id: "1" },
          data: {
            ref_count: 10,
            local_position: 1,
            global_position: 5,
            updated_at: expect.any(Date),
          },
        }),
        expect.objectContaining({
          where: { user_id: "2" },
          data: {
            ref_count: 20,
            local_position: 2,
            global_position: 10,
            updated_at: expect.any(Date),
          },
        }),
      ])
    );
  });
});