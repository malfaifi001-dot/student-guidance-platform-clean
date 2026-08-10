CREATE TABLE `PortfolioSnapshot` (
  `id` VARCHAR(191) NOT NULL,
  `portfolioId` VARCHAR(191) NOT NULL,
  `ownerUserId` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `notes` TEXT NULL,
  `roleAtCreation` ENUM('ADMIN', 'COUNSELOR', 'ACTIVITY_LEADER', 'TEACHER', 'PRINCIPAL', 'SCHOOL_OWNER', 'STAFF') NOT NULL,
  `snapshotVersion` INTEGER NOT NULL DEFAULT 1,
  `summaryJson` JSON NULL,
  `snapshotJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `PortfolioSnapshot_portfolioId_idx`(`portfolioId`),
  INDEX `PortfolioSnapshot_ownerUserId_idx`(`ownerUserId`),
  INDEX `PortfolioSnapshot_schoolAccountId_idx`(`schoolAccountId`),
  INDEX `PortfolioSnapshot_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PortfolioSnapshot`
ADD CONSTRAINT `PortfolioSnapshot_portfolioId_fkey`
FOREIGN KEY (`portfolioId`) REFERENCES `AchievementPortfolio`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PortfolioSnapshot`
ADD CONSTRAINT `PortfolioSnapshot_ownerUserId_fkey`
FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PortfolioSnapshot`
ADD CONSTRAINT `PortfolioSnapshot_schoolAccountId_fkey`
FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
