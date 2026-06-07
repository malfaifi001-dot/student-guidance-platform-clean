CREATE TABLE IF NOT EXISTS `InvoiceSettings` (
  `id` VARCHAR(191) NOT NULL,
  `singletonKey` VARCHAR(191) NOT NULL DEFAULT 'default',
  `sellerName` VARCHAR(191) NOT NULL DEFAULT 'منصة التوجيه الطلابي',
  `sellerDomain` VARCHAR(191) NULL DEFAULT 'smstudents.com',
  `sellerCountry` VARCHAR(191) NULL DEFAULT 'المملكة العربية السعودية',
  `sellerAddress` VARCHAR(191) NULL,
  `commercialRegistration` VARCHAR(191) NULL,
  `taxNumber` VARCHAR(191) NULL,
  `vatEnabled` BOOLEAN NOT NULL DEFAULT false,
  `vatRate` INTEGER NOT NULL DEFAULT 0,
  `invoicePrefix` VARCHAR(191) NOT NULL DEFAULT 'INV',
  `invoiceNote` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `InvoiceSettings_singletonKey_key`(`singletonKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `InvoiceNumberSequence` (
  `id` VARCHAR(191) NOT NULL,
  `year` INTEGER NOT NULL,
  `month` INTEGER NOT NULL,
  `nextNumber` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `InvoiceNumberSequence_year_month_key`(`year`, `month`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Invoice` (
  `id` VARCHAR(191) NOT NULL,
  `invoiceNumber` VARCHAR(191) NOT NULL,
  `paymentTransactionId` VARCHAR(191) NOT NULL,
  `issuedById` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ISSUED',

  `sellerName` VARCHAR(191) NOT NULL,
  `sellerDomain` VARCHAR(191) NULL,
  `sellerCountry` VARCHAR(191) NULL,
  `sellerAddress` VARCHAR(191) NULL,
  `commercialRegistration` VARCHAR(191) NULL,
  `taxNumber` VARCHAR(191) NULL,

  `buyerName` VARCHAR(191) NOT NULL,
  `buyerEmail` VARCHAR(191) NULL,
  `buyerJobTitle` VARCHAR(191) NULL,
  `buyerSchoolName` VARCHAR(191) NULL,
  `buyerAccountName` VARCHAR(191) NULL,

  `itemTitle` VARCHAR(191) NOT NULL,
  `subtotalAmount` INTEGER NOT NULL,
  `taxRate` INTEGER NOT NULL DEFAULT 0,
  `taxAmount` INTEGER NOT NULL DEFAULT 0,
  `totalAmount` INTEGER NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'SAR',

  `pdfUrl` VARCHAR(191) NULL,
  `snapshotJson` JSON NULL,
  `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Invoice_invoiceNumber_key`(`invoiceNumber`),
  UNIQUE INDEX `Invoice_paymentTransactionId_key`(`paymentTransactionId`),
  INDEX `Invoice_paymentTransactionId_idx`(`paymentTransactionId`),
  INDEX `Invoice_issuedAt_idx`(`issuedAt`),
  INDEX `Invoice_status_idx`(`status`),

  PRIMARY KEY (`id`),

  CONSTRAINT `Invoice_paymentTransactionId_fkey`
    FOREIGN KEY (`paymentTransactionId`)
    REFERENCES `PaymentTransaction`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;