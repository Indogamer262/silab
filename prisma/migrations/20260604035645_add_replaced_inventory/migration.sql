-- AlterTable
ALTER TABLE `procurement_detail` ADD COLUMN `replaced_inventory_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `procurement_detail` ADD CONSTRAINT `procurement_detail_replaced_inventory_id_fkey` FOREIGN KEY (`replaced_inventory_id`) REFERENCES `inventory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
