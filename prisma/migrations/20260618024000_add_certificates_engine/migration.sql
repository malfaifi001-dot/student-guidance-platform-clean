CREATE TABLE `CertificateTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  `pageSize` VARCHAR(20) NOT NULL DEFAULT 'A4',
  `orientation` VARCHAR(20) NOT NULL DEFAULT 'LANDSCAPE',
  `templatePath` VARCHAR(191) NULL,
  `previewImagePath` VARCHAR(191) NULL,
  `isSystem` BOOLEAN NOT NULL DEFAULT false,
  `schoolAccountId` VARCHAR(191) NULL,
  `createdById` VARCHAR(191) NULL,
  `themeJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CertificateTemplate_key_key`(`key`),
  INDEX `CertificateTemplate_schoolAccountId_idx`(`schoolAccountId`),
  INDEX `CertificateTemplate_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CertificateBatch` (
  `id` VARCHAR(191) NOT NULL,
  `batchNumber` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NULL,
  `sourceType` VARCHAR(40) NOT NULL DEFAULT 'BULK_IMPORT',
  `sourceId` VARCHAR(191) NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  `totalCount` INTEGER NOT NULL DEFAULT 0,
  `issuedCount` INTEGER NOT NULL DEFAULT 0,
  `failedCount` INTEGER NOT NULL DEFAULT 0,
  `fileName` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `optionsJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CertificateBatch_batchNumber_key`(`batchNumber`),
  INDEX `CertificateBatch_schoolAccountId_idx`(`schoolAccountId`),
  INDEX `CertificateBatch_createdById_idx`(`createdById`),
  INDEX `CertificateBatch_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `IssuedCertificate` (
  `id` VARCHAR(191) NOT NULL,
  `certificateNumber` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NULL,
  `templateId` VARCHAR(191) NULL,
  `batchId` VARCHAR(191) NULL,
  `certificateType` VARCHAR(50) NOT NULL,
  `recipientType` VARCHAR(50) NOT NULL,
  `recipientName` VARCHAR(191) NOT NULL,
  `recipientIdentity` VARCHAR(191) NULL,
  `recipientStudentId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `reason` TEXT NULL,
  `body` TEXT NOT NULL,
  `issueDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `status` VARCHAR(30) NOT NULL DEFAULT 'ISSUED',
  `sourceType` VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
  `sourceId` VARCHAR(191) NULL,
  `pdfUrl` VARCHAR(191) NULL,
  `htmlSnapshot` LONGTEXT NULL,
  `dataJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `IssuedCertificate_certificateNumber_key`(`certificateNumber`),
  INDEX `IssuedCertificate_schoolAccountId_idx`(`schoolAccountId`),
  INDEX `IssuedCertificate_createdById_idx`(`createdById`),
  INDEX `IssuedCertificate_templateId_idx`(`templateId`),
  INDEX `IssuedCertificate_batchId_idx`(`batchId`),
  INDEX `IssuedCertificate_recipientStudentId_idx`(`recipientStudentId`),
  INDEX `IssuedCertificate_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
  INDEX `IssuedCertificate_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `IssuedCertificate`
  ADD CONSTRAINT `IssuedCertificate_templateId_fkey`
  FOREIGN KEY (`templateId`) REFERENCES `CertificateTemplate`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `IssuedCertificate`
  ADD CONSTRAINT `IssuedCertificate_batchId_fkey`
  FOREIGN KEY (`batchId`) REFERENCES `CertificateBatch`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `Service` (`id`, `slug`, `name`, `description`, `status`, `createdAt`, `updatedAt`)
SELECT
  'svc_certificates_honors',
  'certificates-honors',
  'الشهادات والتكريم',
  'إصدار شهادات شكر وتقدير ومشاركة وتميز فردية وجماعية.',
  'ACTIVE',
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `Service` WHERE `slug` = 'certificates-honors'
);

INSERT INTO `CertificateTemplate` (`id`, `key`, `name`, `description`, `status`, `pageSize`, `orientation`, `templatePath`, `previewImagePath`, `isSystem`, `themeJson`, `createdAt`, `updatedAt`)
SELECT
  'cert_tpl_official_green',
  'official-green',
  'القالب الرسمي الأخضر',
  'قالب رسمي A4 عرضي لشهادات الشكر والتقدير.',
  'ACTIVE',
  'A4',
  'LANDSCAPE',
  '/templates/certificates/official-green.svg',
  '/templates/certificates/official-green.svg',
  true,
  JSON_OBJECT('primary', '#0f7a57', 'accent', '#d6b15f', 'identity', 'education'),
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (
  SELECT 1 FROM `CertificateTemplate` WHERE `key` = 'official-green'
);