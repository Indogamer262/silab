-- DropForeignKey
ALTER TABLE `room` DROP FOREIGN KEY `room_user_id_fkey`;

-- DropIndex
DROP INDEX `room_user_id_fkey` ON `room`;

-- AlterTable
ALTER TABLE `room`
    DROP COLUMN `capacity`,
    DROP COLUMN `user_id`;

-- CreateIndex
CREATE UNIQUE INDEX `room_name_key` ON `room`(`name`);