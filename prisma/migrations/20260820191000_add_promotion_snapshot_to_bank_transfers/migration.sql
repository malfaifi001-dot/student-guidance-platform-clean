ALTER TABLE `BankTransferRequest`
  ADD COLUMN `promotionId` VARCHAR(191) NULL;

CREATE INDEX `BankTransferRequest_promotionId_idx`
  ON `BankTransferRequest`(`promotionId`);
