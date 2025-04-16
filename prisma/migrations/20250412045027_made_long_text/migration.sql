/*
  Warnings:

  - A unique constraint covering the columns `[telegram_handle]` on the table `Users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Users` MODIFY `ideal_setup` LONGTEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Users_telegram_handle_key` ON `Users`(`telegram_handle`);

-- CreateIndex
CREATE UNIQUE INDEX `Users_email_key` ON `Users`(`email`);
