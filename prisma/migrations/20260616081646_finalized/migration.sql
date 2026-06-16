-- AlterTable
ALTER TABLE `procurement_draft` MODIFY `status` ENUM('DRAFT', 'LOCKED', 'FINALIZED') NOT NULL;
