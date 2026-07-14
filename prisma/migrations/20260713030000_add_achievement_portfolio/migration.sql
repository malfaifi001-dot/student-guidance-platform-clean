CREATE TABLE `AchievementPortfolio` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `ownerUserId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `roleKey` VARCHAR(191) NOT NULL DEFAULT 'TEACHER',
  `academicYear` VARCHAR(191) NOT NULL,
  `term` VARCHAR(191) NOT NULL,
  `themeId` VARCHAR(191) NOT NULL DEFAULT 'ministry-elegant',
  `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `introText` TEXT NULL,
  `conclusionText` TEXT NULL,
  `visionText` TEXT NULL,
  `missionText` TEXT NULL,
  `bioText` TEXT NULL,
  `qualificationsJson` JSON NULL,
  `coursesJson` JSON NULL,
  `certificatesJson` JSON NULL,
  `settingsJson` JSON NULL,
  `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `AchievementPortfolio_scope_key`(`schoolAccountId`, `ownerUserId`, `academicYear`, `term`),
  INDEX `AchievementPortfolio_schoolAccountId_idx`(`schoolAccountId`),
  INDEX `AchievementPortfolio_ownerUserId_idx`(`ownerUserId`),
  INDEX `AchievementPortfolio_roleKey_idx`(`roleKey`),
  INDEX `AchievementPortfolio_status_idx`(`status`),
  INDEX `AchievementPortfolio_themeId_idx`(`themeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AchievementPortfolioSection` (
  `id` VARCHAR(191) NOT NULL,
  `portfolioId` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `sectionKey` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `introText` TEXT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `metadataJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `AchievementPortfolioSection_portfolio_section_key`(`portfolioId`, `sectionKey`),
  INDEX `AchievementPortfolioSection_portfolioId_idx`(`portfolioId`),
  INDEX `AchievementPortfolioSection_kind_idx`(`kind`),
  INDEX `AchievementPortfolioSection_sortOrder_idx`(`sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AchievementPortfolioItem` (
  `id` VARCHAR(191) NOT NULL,
  `portfolioId` VARCHAR(191) NOT NULL,
  `sectionId` VARCHAR(191) NULL,
  `sourceType` VARCHAR(191) NOT NULL,
  `sourceId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `isVisible` BOOLEAN NOT NULL DEFAULT true,
  `metadataJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `AchievementPortfolioItem_portfolioId_idx`(`portfolioId`),
  INDEX `AchievementPortfolioItem_sectionId_idx`(`sectionId`),
  INDEX `AchievementPortfolioItem_sourceType_idx`(`sourceType`),
  INDEX `AchievementPortfolioItem_sourceId_idx`(`sourceId`),
  INDEX `AchievementPortfolioItem_isVisible_idx`(`isVisible`),
  INDEX `AchievementPortfolioItem_sortOrder_idx`(`sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AchievementPortfolio`
ADD CONSTRAINT `AchievementPortfolio_schoolAccountId_fkey`
FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AchievementPortfolio`
ADD CONSTRAINT `AchievementPortfolio_ownerUserId_fkey`
FOREIGN KEY (`ownerUserId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AchievementPortfolioSection`
ADD CONSTRAINT `AchievementPortfolioSection_portfolioId_fkey`
FOREIGN KEY (`portfolioId`) REFERENCES `AchievementPortfolio`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AchievementPortfolioItem`
ADD CONSTRAINT `AchievementPortfolioItem_portfolioId_fkey`
FOREIGN KEY (`portfolioId`) REFERENCES `AchievementPortfolio`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AchievementPortfolioItem`
ADD CONSTRAINT `AchievementPortfolioItem_sectionId_fkey`
FOREIGN KEY (`sectionId`) REFERENCES `AchievementPortfolioSection`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;