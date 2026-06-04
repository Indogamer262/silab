/*
  Warnings:

  - The primary key for the `room` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `capacity` on the `room` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `room` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `room` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `inventory` DROP FOREIGN KEY `inventory_room_id_fkey`;

-- DropForeignKey
ALTER TABLE `room` DROP FOREIGN KEY `room_user_id_fkey`;

-- DropIndex
DROP INDEX `inventory_room_id_fkey` ON `inventory`;

-- DropIndex
DROP INDEX `room_user_id_fkey` ON `room`;

-- AlterTable
ALTER TABLE `inventory` MODIFY `room_id` VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE `room` DROP PRIMARY KEY,
    DROP COLUMN `capacity`,
    DROP COLUMN `id`,
    DROP COLUMN `user_id`,
    ADD PRIMARY KEY (`name`);

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `room`(`name`) ON DELETE RESTRICT ON UPDATE CASCADE;
