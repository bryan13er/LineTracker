const fs = require("fs");
const csv = require("csv-parser");
const { PrismaClient } = require("@prisma/client");
const Line = require("./line");

// TODO: was 1000
const BATCH_SIZE = 1; // Process and update every 1000 users

class CSVProcessor {
  constructor(filePath, prismaInstance = new PrismaClient()) {
    this.filePath = filePath;
    this.prisma = prismaInstance;
    this.line = new Line(this.prisma);
    this.userCount = 0;
  }

  clearLineObject(){
    this.line.clear();
  }

  async processCSV() {
    const stream = fs.createReadStream(this.filePath).pipe(csv());

    for await (const row of stream) {
      const dbUser = this.createDBUser(row);
      try {
        // Check if the user already exists in the database
        const existingUser = await this.prisma.users.findUnique({
          where: { user_id: dbUser.user_id }, // Match on the primary key
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
        }

      } catch (error) {
        console.error("Error processing user:", dbUser.user_id);
        console.error("Prisma Error:", error);
      }
    }

    // Final update for remaining users
    if (this.line.needsReSortBuckets.size > 0) {
      console.log("happens");
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
        await this.updateDatabaseBatchUsersPosition(users)
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
      })
    );
  
    // console.log("Updates to be applied:", updates); // Log before applying updates
    await this.prisma.$transaction(updates);
    // console.log("Updates successfully applied:", updates); // Log after applying updates
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

  async getTopTenUsers() {
    try {
      const topUsers = await this.prisma.users.findMany({
        orderBy: {
          global_position: 'asc', // Sort by global_position in descending order
        },
        take: 10, // Limit to top 10 users
      });

      return topUsers;
    } catch (error) {
      console.error('Error fetching top ten users:', error);
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
