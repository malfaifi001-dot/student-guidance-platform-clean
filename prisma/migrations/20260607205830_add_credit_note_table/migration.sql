CREATE TABLE IF NOT EXISTS `CreditNote` (
  `id` VARCHAR(191) NOT NULL,
  `creditNoteNumber` VARCHAR(191) NOT NULL,
  `invoiceId` VARCHAR(191) NOT NULL,
  `issuedById` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ISSUED',
  `reason` TEXT NULL,
  `subtotalAmount` INTEGER NOT NULL,
  `taxRate` INTEGER NOT NULL DEFAULT 0,
  `taxAmount` INTEGER NOT NULL DEFAULT 0,
  `totalAmount` INTEGER NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'SAR',
  `snapshotJson` JSON NULL,
  `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `CreditNote_creditNoteNumber_key`(`creditNoteNumber`),
  INDEX `CreditNote_invoiceId_idx`(`invoiceId`),
  INDEX `CreditNote_issuedAt_idx`(`issuedAt`),
  INDEX `CreditNote_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CreditNote`
  ADD CONSTRAINT `CreditNote_invoiceId_fkey`
  FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;