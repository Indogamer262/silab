-- DropForeignKey
ALTER TABLE `inventory` DROP FOREIGN KEY `inventory_room_id_fkey`;

-- AlterTable: Add id column to room, change primary key
ALTER TABLE `room` DROP PRIMARY KEY,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- CreateIndex: Add unique constraint on room name
CREATE UNIQUE INDEX `room_name_key` ON `room`(`name`);

-- AlterTable: Change inventory.room_id from VARCHAR to INT
-- First, update existing inventory rows to use room.id instead of room.name
UPDATE `inventory` i
    INNER JOIN `room` r ON i.`room_id` = r.`name`
    SET i.`room_id` = r.`id`;

ALTER TABLE `inventory` MODIFY `room_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
