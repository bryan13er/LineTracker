class BackendDatabaseCalls {
  constructor(prismaInstance) {
    this.prisma = prismaInstance; // Store the Prisma instance
  }

  async fetchUserByTelegramHandle(telegramHandle) {
    if (!telegramHandle) {
      throw new Error("Telegram handle must be provided to fetch the user.");
    }

    const user = await this.prisma.users.findUnique({
      where: {
        telegram_handle: telegramHandle,
      },
    });

    return user;
  }

  async fetchUserByEmail(email) {
		console.log('TEST', email);

    if (!email) {
      throw new Error("Email must be provided to fetch the user.");
    }

    const user = await this.prisma.users.findUnique({
      where: {
        email: email,
      },
    });

    return user;
  }

  async fetchTopUsersByGlobalPosition(limit) {
    if (!limit || limit <= 0) {
      throw new Error("A valid limit must be provided to fetch the top users.");
    }

    const topUsers = await this.prisma.users.findMany({
      orderBy: {
        global_position: "asc", // Ascending order (lower global_position is better)
      },
      take: limit, // Limit the number of results to the specified value
      select: {
        user_id: true,
        ref_count: true,
				global_position: true,
        email: true,
        telegram_handle: true,
      },
    });

    return topUsers;
  }

  async fetchUsersByRefCount(refCount) {
    if (refCount === undefined || refCount === null || refCount < 0) {
      throw new Error("A valid ref_count must be provided to fetch users.");
    }

    const users = await this.prisma.users.findMany({
      where: {
        ref_count: refCount, // Filter users by ref_count
      },
      orderBy: {
        global_position: "asc"
      },
      select: {
        user_id: true, // Include only the user_id
        ref_count: true, // Include the ref_count
				global_position: true,
        email: true,
        telegram_handle: true,
      },
    });

    return users;
  }

  async fetchAllUsersInAscendingOrder() {
    const users = await this.prisma.users.findMany({
      orderBy: {
        user_id: "asc", // Sort users by user_id in ascending order
      },
      select: {
        user_id: true, // Include only the user_id
        ref_count: true, // Include the ref_count
        email: true, // Include the email
        telegram_handle: true, // Include the telegram_handle
      },
    });

    return users;
  }

  async updateEmailByTelegramHandle(telegramHandle, email) {
    if (!telegramHandle) {
      throw new Error("Telegram handle must be provided to update the email.");
    }

    if (!email) {
      throw new Error("Email must be provided to update the user.");
    }

    const user = await this.prisma.users.findUnique({
      where: { telegram_handle: telegramHandle },
    });

    if (!user) {
      throw new Error(`No user found with telegram handle: ${telegramHandle}`);
    }

    const updatedUser = await this.prisma.users.update({
      where: {
        telegram_handle: telegramHandle,
      },
      data: {
        email: email,
      },
      select: {
        user_id: true,
        telegram_handle: true,
        email: true,
      },
    });

    return updatedUser;
  }

  async updateEmailByTelegramHandle(telegramHandle, email) {
    if (!telegramHandle) {
      throw new Error("Telegram handle must be provided to update the email.");
    }

    if (!email) {
      throw new Error("Email must be provided to update the user.");
    }

    const user = await this.prisma.users.findUnique({
      where: { telegram_handle: telegramHandle },
    });

    if (!user) {
      throw new Error(`No user found with telegram handle: ${telegramHandle}`);
    }

    const updatedUser = await this.prisma.users.update({
      where: {
        telegram_handle: telegramHandle,
      },
      data: {
        email: email,
      },
      select: {
        user_id: true,
        telegram_handle: true,
        email: true,
      },
    });

    return updatedUser;
  }

  async countTotalUsers() {
    const count = await this.prisma.users.count();
    return count;
  }
}

module.exports = BackendDatabaseCalls;
