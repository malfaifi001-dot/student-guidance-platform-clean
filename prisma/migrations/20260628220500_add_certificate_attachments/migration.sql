CREATE TABLE `CertificateAttachment` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `targetType` VARCHAR(60) NOT NULL,
  `targetId` VARCHAR(191) NOT NULL,
  `certificateId` VARCHAR(191) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `CertificateAttachment_scope_certificate_key`
ON `CertificateAttachment`(`schoolAccountId`, `targetType`, `targetId`, `certificateId`);

CREATE INDEX `CertificateAttachment_target_idx`
ON `CertificateAttachment`(`schoolAccountId`, `targetType`, `targetId`);

CREATE INDEX `CertificateAttachment_certificate_idx`
ON `CertificateAttachment`(`certificateId`);

CREATE INDEX `CertificateAttachment_createdBy_idx`
ON `CertificateAttachment`(`createdById`);

ALTER TABLE `CertificateAttachment`
ADD CONSTRAINT `CertificateAttachment_certificateId_fkey`
FOREIGN KEY (`certificateId`) REFERENCES `IssuedCertificate`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;