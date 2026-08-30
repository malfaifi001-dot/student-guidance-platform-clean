ALTER TABLE `AssessmentAnalysis`
  ADD COLUMN `createdById` VARCHAR(191) NULL;

CREATE INDEX `AssessmentAnalysis_createdById_idx` ON `AssessmentAnalysis`(`createdById`);

ALTER TABLE `AssessmentAnalysis`
  ADD CONSTRAINT `AssessmentAnalysis_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
