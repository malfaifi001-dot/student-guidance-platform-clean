CREATE TABLE IF NOT EXISTS `AssessmentAnalysis` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `sourceFile` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
  `uploadMode` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
  `totalStudents` INTEGER NOT NULL DEFAULT 0,
  `totalRows` INTEGER NOT NULL DEFAULT 0,
  `totalSubjects` INTEGER NOT NULL DEFAULT 0,
  `averagePercentage` DOUBLE NULL,
  `summaryJson` JSON NULL,
  `rowsJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `AssessmentAnalysis_schoolAccountId_idx` ON `AssessmentAnalysis`(`schoolAccountId`);
CREATE INDEX `AssessmentAnalysis_status_idx` ON `AssessmentAnalysis`(`status`);
CREATE INDEX `AssessmentAnalysis_createdAt_idx` ON `AssessmentAnalysis`(`createdAt`);

ALTER TABLE `AssessmentAnalysis`
  ADD CONSTRAINT `AssessmentAnalysis_schoolAccountId_fkey`
  FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;