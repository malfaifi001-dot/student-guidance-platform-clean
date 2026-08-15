-- Additive ADMIN operational expense management. Existing payment and invoice tables are untouched.
CREATE TABLE `ExpenseCategory` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `isSystem` BOOLEAN NOT NULL DEFAULT false,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ExpenseCategory_slug_key` (`slug`),
  UNIQUE INDEX `ExpenseCategory_name_key` (`name`),
  INDEX `ExpenseCategory_isActive_name_idx` (`isActive`, `name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ExpensePaymentSource` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `type` ENUM('BANK_ACCOUNT', 'CARD', 'CASH', 'WALLET', 'OTHER') NOT NULL,
  `institutionName` VARCHAR(191) NULL,
  `maskedIdentifier` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `ExpensePaymentSource_isActive_type_idx` (`isActive`, `type`),
  INDEX `ExpensePaymentSource_name_idx` (`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OperationalExpense` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `vendor` VARCHAR(191) NULL,
  `categoryId` VARCHAR(191) NOT NULL,
  `amountBeforeTax` DECIMAL(14, 2) NOT NULL,
  `taxAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
  `totalAmount` DECIMAL(14, 2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'SAR',
  `invoiceNumber` VARCHAR(191) NULL,
  `invoiceDate` DATETIME(3) NULL,
  `dueDate` DATETIME(3) NULL,
  `paidDate` DATETIME(3) NULL,
  `status` ENUM('DUE', 'PAID', 'OVERDUE', 'CANCELED') NOT NULL DEFAULT 'DUE',
  `paymentMethod` ENUM('BANK_TRANSFER', 'CARD', 'CASH', 'WALLET', 'DIRECT_DEBIT', 'OTHER') NULL,
  `paymentSourceId` VARCHAR(191) NULL,
  `isRecurring` BOOLEAN NOT NULL DEFAULT false,
  `recurrenceInterval` ENUM('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL') NULL,
  `nextRenewalDate` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `paidById` VARCHAR(191) NULL,
  `paidByName` VARCHAR(191) NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdByName` VARCHAR(191) NULL,
  `updatedById` VARCHAR(191) NOT NULL,
  `updatedByName` VARCHAR(191) NULL,
  `archivedAt` DATETIME(3) NULL,
  `archivedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `OperationalExpense_status_dueDate_idx` (`status`, `dueDate`),
  INDEX `OperationalExpense_categoryId_invoiceDate_idx` (`categoryId`, `invoiceDate`),
  INDEX `OperationalExpense_paymentSourceId_paidDate_idx` (`paymentSourceId`, `paidDate`),
  INDEX `OperationalExpense_isRecurring_nextRenewalDate_idx` (`isRecurring`, `nextRenewalDate`),
  INDEX `OperationalExpense_vendor_idx` (`vendor`),
  INDEX `OperationalExpense_archivedAt_idx` (`archivedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ExpensePaymentRecord` (
  `id` VARCHAR(191) NOT NULL,
  `expenseId` VARCHAR(191) NOT NULL,
  `amountBeforeTax` DECIMAL(14, 2) NOT NULL,
  `taxAmount` DECIMAL(14, 2) NOT NULL,
  `totalAmount` DECIMAL(14, 2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL,
  `paymentMethod` ENUM('BANK_TRANSFER', 'CARD', 'CASH', 'WALLET', 'DIRECT_DEBIT', 'OTHER') NOT NULL,
  `paymentSourceId` VARCHAR(191) NULL,
  `paymentSourceName` VARCHAR(191) NOT NULL,
  `paymentSourceType` ENUM('BANK_ACCOUNT', 'CARD', 'CASH', 'WALLET', 'OTHER') NOT NULL,
  `paymentSourceSnapshot` JSON NULL,
  `paidAt` DATETIME(3) NOT NULL,
  `reference` VARCHAR(191) NULL,
  `recordedById` VARCHAR(191) NOT NULL,
  `recordedByName` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `ExpensePaymentRecord_expenseId_paidAt_idx` (`expenseId`, `paidAt`),
  INDEX `ExpensePaymentRecord_paymentSourceId_paidAt_idx` (`paymentSourceId`, `paidAt`),
  INDEX `ExpensePaymentRecord_recordedById_idx` (`recordedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ExpenseAttachment` (
  `id` VARCHAR(191) NOT NULL,
  `expenseId` VARCHAR(191) NOT NULL,
  `originalFileName` VARCHAR(191) NOT NULL,
  `storedFileName` VARCHAR(191) NOT NULL,
  `mimeType` VARCHAR(191) NOT NULL,
  `sizeBytes` INTEGER NOT NULL,
  `fileUrl` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdByName` VARCHAR(191) NULL,
  `isArchived` BOOLEAN NOT NULL DEFAULT false,
  `archivedAt` DATETIME(3) NULL,
  `archivedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `ExpenseAttachment_expenseId_storedFileName_key` (`expenseId`, `storedFileName`),
  INDEX `ExpenseAttachment_expenseId_isArchived_createdAt_idx` (`expenseId`, `isArchived`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ExpenseAuditEntry` (
  `id` VARCHAR(191) NOT NULL,
  `expenseId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `summary` VARCHAR(191) NOT NULL,
  `beforeJson` JSON NULL,
  `afterJson` JSON NULL,
  `actorUserId` VARCHAR(191) NOT NULL,
  `actorName` VARCHAR(191) NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `ExpenseAuditEntry_expenseId_createdAt_idx` (`expenseId`, `createdAt`),
  INDEX `ExpenseAuditEntry_actorUserId_createdAt_idx` (`actorUserId`, `createdAt`),
  INDEX `ExpenseAuditEntry_action_idx` (`action`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OperationalExpense`
  ADD CONSTRAINT `OperationalExpense_categoryId_fkey`
  FOREIGN KEY (`categoryId`) REFERENCES `ExpenseCategory`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `OperationalExpense_paymentSourceId_fkey`
  FOREIGN KEY (`paymentSourceId`) REFERENCES `ExpensePaymentSource`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ExpensePaymentRecord`
  ADD CONSTRAINT `ExpensePaymentRecord_expenseId_fkey`
  FOREIGN KEY (`expenseId`) REFERENCES `OperationalExpense`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ExpensePaymentRecord_paymentSourceId_fkey`
  FOREIGN KEY (`paymentSourceId`) REFERENCES `ExpensePaymentSource`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ExpenseAttachment`
  ADD CONSTRAINT `ExpenseAttachment_expenseId_fkey`
  FOREIGN KEY (`expenseId`) REFERENCES `OperationalExpense`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `ExpenseAuditEntry`
  ADD CONSTRAINT `ExpenseAuditEntry_expenseId_fkey`
  FOREIGN KEY (`expenseId`) REFERENCES `OperationalExpense`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `ExpenseCategory` (`id`, `slug`, `name`, `isSystem`, `isActive`, `createdById`, `createdAt`, `updatedAt`) VALUES
  ('expense-category-hosting', 'hosting', 'الاستضافة', true, true, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('expense-category-domain', 'domain', 'الدومين', true, true, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('expense-category-messaging', 'messaging-communications', 'الرسائل والاتصالات', true, true, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('expense-category-external-saas', 'external-saas', 'خدمات وبرامج خارجية', true, true, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('expense-category-maintenance', 'maintenance-development', 'الصيانة والتطوير', true, true, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('expense-category-marketing', 'marketing', 'التسويق', true, true, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('expense-category-salaries', 'salaries-rewards', 'الرواتب والمكافآت', true, true, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('expense-category-government', 'government-fees', 'رسوم حكومية', true, true, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('expense-category-other', 'other', 'أخرى', true, true, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
