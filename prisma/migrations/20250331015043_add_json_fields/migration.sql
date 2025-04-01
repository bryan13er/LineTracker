/*
  Warnings:

  - You are about to drop the `Users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `Users`;

-- CreateTable
CREATE TABLE `User` (
    `user_id` VARCHAR(191) NOT NULL,
    `ref_id` VARCHAR(191) NULL,
    `submit_time` DATETIME(3) NOT NULL,
    `telegram_handle` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `trading_style` VARCHAR(191) NULL,
    `ideal_setup` VARCHAR(191) NULL,
    `current_trading_platforms` JSON NULL,
    `trading_methods` JSON NULL,
    `favorite_feature` JSON NULL,
    `wishlist_feature` JSON NULL,
    `ref_count` INTEGER NOT NULL DEFAULT 0,
    `local_position` INTEGER NULL,
    `global_position` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
