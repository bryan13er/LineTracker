const fs = require("fs");
const csv = require("csv-parser");
const { PrismaClient } = require("@prisma/client");
const Line = require("./line");

const prisma = new PrismaClient();
const BATCH_SIZE = 1000; // Process and update every 1000 users

class CSVProcessor {
  constructor(filePath) {
    this.filePath = filePath;
    this.line = new Line();
    this.userCount = 0;
  }

  async processCSV() {
    const stream = fs.createReadStream(this.filePath).pipe(csv());

    for await (const row of stream) {
      const dbUser = this.createDBUser(row);

      try {
        // Insert user into the database
        await prisma.user.create({ data: dbUser });
        // Insert user into the line object
        this.addToLine(dbUser);
        this.userCount++;

        // Batch processing
        if (this.userCount % BATCH_SIZE === 0) {
          await this.sortAndUpdate();
        }
      } catch (error) {
        console.error("Error processing user:", dbUser.user_id, error);
      }
    }

    // Final update for remaining users
    if (this.line.markBucketAsUnsorted.size > 0) {
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
      ref_count: 0,
      local_position: null,
      global_position: null,
    };
  }

  addToLine(dbUser) {
    lineUser = this.line.createUser(
      dbUser.user_id,
      dbUser.ref_id,
      dbUser.submit_time,
    );
    this.line.insertUser(lineUser);
  }

  async sortAndUpdate() {
    const groupsToUpdate = this.line.sortAllBuckets();

    // update users per affected group
    for (const group of groupsToUpdate) {
      // users is an array
      const users = this.line.getGroup(group);
      if (users.length > 0) {
        this.updateDatabaseBatchUsersPosition(users)
      }
    }
  }

  async updateDatabaseBatchUsersPosition(users){
    if (users.length === 0) return;
    
    await prisma.$transaction(
      users.map(user => prisma.user.update({
        where: { user_id: user.user_id },
        data: {
          local_position: user.local_position,
          global_position: user.global_position,
          updated_at: new Date(),
        },
      }))
    );
  }

  async updateDatabaseUserPosition(user) {
    await prisma.user.update({
      where: {
        user_id: user.user_id,
      },
      data: {
        local_position: user.local_position,
        global_position: user.global_position,
        updated_at: new Date(),
      },
    });
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
