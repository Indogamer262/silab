-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(7) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `role` ENUM('ADMIN', 'LAB_HEAD', 'PRODI_HEAD', 'ADMIN_STAFF', 'LAB_STAFF') NOT NULL,
    `password` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `category` ENUM('ELECTRONICS', 'NON_ELECTRONICS') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price` BIGINT NOT NULL,
    `link` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consumable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `stock` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,

    UNIQUE INDEX `consumable_item_id_key`(`item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procurement_draft` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL,
    `user_id` VARCHAR(7) NOT NULL,
    `status` ENUM('DRAFT', 'LOCKED') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `procurement_detail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantity` INTEGER NOT NULL,
    `price` BIGINT NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL,
    `draft_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `capacity` INTEGER NOT NULL,
    `location` VARCHAR(100) NOT NULL,
    `user_id` VARCHAR(7) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `qr_code` VARCHAR(255) NULL,
    `received_date` DATE NOT NULL,
    `condition` ENUM('GOOD', 'FAIR', 'POOR', 'BROKEN', 'LOST') NOT NULL,
    `item_id` INTEGER NOT NULL,
    `room_id` INTEGER NOT NULL,

    UNIQUE INDEX `inventory_qr_code_key`(`qr_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenance_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `description` TEXT NOT NULL,
    `consumable_used_qty` INTEGER NULL,
    `inventory_id` INTEGER NOT NULL,
    `consumable_id` INTEGER NULL,
    `user_id` VARCHAR(7) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `consumable` ADD CONSTRAINT `consumable_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_draft` ADD CONSTRAINT `procurement_draft_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_detail` ADD CONSTRAINT `procurement_detail_draft_id_fkey` FOREIGN KEY (`draft_id`) REFERENCES `procurement_draft`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `procurement_detail` ADD CONSTRAINT `procurement_detail_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room` ADD CONSTRAINT `room_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_log` ADD CONSTRAINT `maintenance_log_inventory_id_fkey` FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_log` ADD CONSTRAINT `maintenance_log_consumable_id_fkey` FOREIGN KEY (`consumable_id`) REFERENCES `consumable`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenance_log` ADD CONSTRAINT `maintenance_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
