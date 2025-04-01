-- DropIndex
DROP INDEX `User_email_key` ON `User`;

-- DropIndex
DROP INDEX `User_telegram_handle_key` ON `User`;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `global_position` INTEGER NULL,
    ADD COLUMN `local_position` INTEGER NULL,
    ADD COLUMN `ref_count` INTEGER NOT NULL DEFAULT 0;
