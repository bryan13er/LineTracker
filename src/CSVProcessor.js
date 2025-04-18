const fs = require("fs");
const csv = require("csv-parser");
const { PrismaClient } = require("@prisma/client");
const Line = require("./Line");

// TODO: was 1
const BATCH_SIZE = 30000; // Process and update every 1000 users

class CSVProcessor {
  constructor(filePath, prismaInstance = new PrismaClient(), max_ref_count = 0) {
    this.filePath = filePath;
    this.prisma = prismaInstance;
    this.line = new Line(this.prisma, max_ref_count);
    this.userCount = 0;
  }

  clearLineObject() {
    this.line.clear();
  }

  async processCSV() {
    const stream = fs.createReadStream(this.filePath).pipe(csv());

    for await (const row of stream) {
      // skip empty row
      if (
        Object.values(row).every(
          (value) => value === "" || value === null || value === undefined,
        )
      ) {
        continue;
      }

      const dbUser = this.createDBUser(row);
      try {
        // Check if the user already exists in the database
        const existingUser = await this.prisma.users.findFirst({
          where: {
            OR: [
              { user_id: dbUser.user_id },
              { email: dbUser.email },
              { telegram_handle: dbUser.telegram_handle }
            ]
          },
        });

        if (existingUser) {
          continue;
        }

        // Insert user into the database
        await this.prisma.users.create({ data: dbUser });
        await this.addToLine(dbUser);
        this.userCount++;

        // Batch processing
        if (this.userCount % BATCH_SIZE === 0) {
          await this.sortAndUpdate();
          this.clearLineObject();
          // break;
        }
      } catch (error) {
        console.error("Error processing user:", dbUser.user_id);
        console.error("Prisma Error:", error);
      }
    }

    // Final update for remaining users
    if (this.line.needsReSortBuckets.size > 0) {
      await this.sortAndUpdate();
    }

    console.log("CSV Processing Complete");
  }

  createDBUser(row) {
    return {
      user_id: row["user_id"],
      ref_id: row["ref_id"] || null,
      submit_time: new Date(row["Submitted at"]),
      telegram_handle: row["Please enter your telegram or email"] || null,
      email: row["email@email.com"] || null,
      trading_style: row["How do you describe your trading style?"] || null,
      ideal_setup: row["What is your ideal trading setup?"] || null,
      current_trading_platforms: JSON.stringify(this.parsePlatforms(row)),
      trading_methods: JSON.stringify(this.parseTradingMethods(row)),
      favorite_feature: JSON.stringify(
        [
          row[
            "What is your favorite feature on other Trading Platforms that you would like to see in KiFi? (1)"
          ],
          row[
            "What is your favorite feature on other Trading Platforms that you would like to see in KiFi? (2)"
          ],
        ].filter(Boolean),
      ),
      wishlist_feature: JSON.stringify(
        [
          row[
            "What is one feature you wish a platform had but most don't? (1)"
          ],
          row[
            "What is one feature you wish a platform had but most don't? (2)"
          ],
        ].filter(Boolean),
      ),
      ref_count: -1,
      local_position: null,
      global_position: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  async addToLine(dbUser) {
    const lineUser = this.line.createUser(
      dbUser.user_id,
      dbUser.ref_id,
      dbUser.submit_time,
    );
    await this.line.insertUser(lineUser);
  }

  async sortAndUpdate() {
    const groupsToUpdate = await this.line.sortAllBuckets();

    // update users per affected group
    for (const group of groupsToUpdate) {
      // users is an array
      // the users in here are a modified users object
      const users = this.line.getGroup(group);
      if (users.length > 0) {
        await this.updateDatabaseBatchUsersPosition(users);
      }
    }
  }

  async updateDatabaseBatchUsersPosition(users) {
    if (users.length === 0) return;

    const updates = users.map((user) =>
      this.prisma.users.update({
        where: { user_id: user.user_id },
        data: {
          ref_count: user.referrals,
          local_position: user.local_position,
          global_position: user.global_position,
          updated_at: new Date(),
        },
      }),
    );

    await this.prisma.$transaction(updates);
  }

  async updateDatabaseUserPosition(user) {
    await this.prisma.users.update({
      where: {
        user_id: user.user_id,
      },
      data: {
        ref_count: user.referrals,
        local_position: user.local_position,
        global_position: user.global_position,
        updated_at: new Date(),
      },
    });
  }

  async getTopXUsers(topXUsers = 10) {
    try {
      const topUsers = await this.prisma.users.findMany({
        orderBy: {
          global_position: "asc", // Sort by global_position in descending order
        },
        take: topXUsers,
      });

      return topUsers;
    } catch (error) {
      console.error("Error fetching top ten users:", error);
      throw error;
    }
  }

  parsePlatforms(row) {
    return {
      Ethereum: row["Where do you currently Trade? (Ethereum)"] || false,
      Solana: row["Where do you currently Trade? (Solana)"] || false,
      Base: row["Where do you currently Trade? (Base)"] || false,
      BNB: row["Where do you currently Trade? (BNB)"] || false,
      Polygon: row["Where do you currently Trade? (Polygon)"] || false,
      Other: row["Where do you currently Trade? (Other)"] || false,
    };
  }

  parseTradingMethods(row) {
    return {
      Mobile: row["How do you currently Trade? (Mobile)"] || false,
      Desktop: row["How do you currently Trade? (Desktop)"] || false,
    };
  }
}

module.exports = CSVProcessor;
