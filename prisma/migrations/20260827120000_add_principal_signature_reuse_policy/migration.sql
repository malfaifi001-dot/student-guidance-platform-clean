-- AlterTable
ALTER TABLE `SchoolProfile`
  ADD COLUMN `principalSignatureReusePolicy` ENUM('ALL_STAFF', 'SELECTED_STAFF', 'MANUAL_ONLY') NOT NULL DEFAULT 'MANUAL_ONLY';

-- CreateTable
CREATE TABLE `PrincipalSignatureReuseAuthorization` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `PrincipalSignatureReuseAuthorization_schoolAccountId_userId_key`(`schoolAccountId`, `userId`),
  INDEX `PrincipalSignatureReuseAuthorization_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PrincipalSignatureReuseAuthorization`
  ADD CONSTRAINT `PrincipalSignatureReuseAuthorization_schoolAccountId_fkey`
  FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PrincipalSignatureReuseAuthorization`
  ADD CONSTRAINT `PrincipalSignatureReuseAuthorization_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
