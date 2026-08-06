-- Align the existing timetable foundation with the current workspace models.
-- Existing legacy columns and tables are intentionally preserved.

ALTER TABLE `TimetableProject`
  MODIFY `status` ENUM('DRAFT','READY','GENERATED','APPROVED','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT';

ALTER TABLE `TimetableTeacher`
  ADD COLUMN IF NOT EXISTS `specialty` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `maxWeeklyLoad` INTEGER NOT NULL DEFAULT 24;

UPDATE `TimetableTeacher`
SET
  `specialty` = COALESCE(`specialty`, `specialization`),
  `maxWeeklyLoad` = CASE
    WHEN `maxWeeklyLoad` = 24 AND `requiredLoad` > 0 THEN `requiredLoad`
    ELSE `maxWeeklyLoad`
  END;

ALTER TABLE `TimetableClass`
  ADD COLUMN IF NOT EXISTS `isActive` BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS `TimetableClass_isActive_idx`
  ON `TimetableClass`(`isActive`);

ALTER TABLE `TimetableSubject`
  ADD COLUMN IF NOT EXISTS `catalogKey` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `isActive` BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS `TimetableSubject_catalogKey_idx`
  ON `TimetableSubject`(`catalogKey`);
CREATE INDEX IF NOT EXISTS `TimetableSubject_isActive_idx`
  ON `TimetableSubject`(`isActive`);

CREATE TABLE IF NOT EXISTS `TimetableClassSubject` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `classId` VARCHAR(191) NOT NULL,
  `subjectId` VARCHAR(191) NOT NULL,
  `weeklyLessons` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TimetableClassSubject_projectId_classId_subjectId_key`(`projectId`, `classId`, `subjectId`),
  INDEX `TimetableClassSubject_projectId_idx`(`projectId`),
  INDEX `TimetableClassSubject_classId_idx`(`classId`),
  INDEX `TimetableClassSubject_subjectId_idx`(`subjectId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TimetableClassSubject_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `TimetableProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TimetableClassSubject_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `TimetableClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TimetableClassSubject_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `TimetableSubject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `TimetableAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `classId` VARCHAR(191) NOT NULL,
  `subjectId` VARCHAR(191) NOT NULL,
  `assignedLessons` INTEGER NOT NULL,
  `singlePeriods` INTEGER NOT NULL DEFAULT 0,
  `doublePeriods` INTEGER NOT NULL DEFAULT 0,
  `fixedSlotsJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TimetableAssignment_projectId_teacherId_classId_subjectId_key`(`projectId`, `teacherId`, `classId`, `subjectId`),
  INDEX `TimetableAssignment_projectId_idx`(`projectId`),
  INDEX `TimetableAssignment_teacherId_idx`(`teacherId`),
  INDEX `TimetableAssignment_classId_idx`(`classId`),
  INDEX `TimetableAssignment_subjectId_idx`(`subjectId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TimetableAssignment_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `TimetableProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TimetableAssignment_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `TimetableTeacher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TimetableAssignment_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `TimetableClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TimetableAssignment_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `TimetableSubject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `TimetableClassSubject`
  (`id`, `projectId`, `classId`, `subjectId`, `weeklyLessons`, `createdAt`, `updatedAt`)
SELECT
  CONCAT('legacy-cs-', `id`),
  `projectId`,
  `classId`,
  `subjectId`,
  `weeklyPeriods`,
  `createdAt`,
  `updatedAt`
FROM `TimetableTeachingAssignment`;

INSERT IGNORE INTO `TimetableAssignment`
  (`id`, `projectId`, `teacherId`, `classId`, `subjectId`, `assignedLessons`, `singlePeriods`, `doublePeriods`, `fixedSlotsJson`, `createdAt`, `updatedAt`)
SELECT
  `id`,
  `projectId`,
  `teacherId`,
  `classId`,
  `subjectId`,
  `weeklyPeriods`,
  CASE WHEN `consecutiveBlockSize` > 1 THEN MOD(`weeklyPeriods`, `consecutiveBlockSize`) ELSE `weeklyPeriods` END,
  CASE WHEN `consecutiveBlockSize` > 1 THEN FLOOR(`weeklyPeriods` / `consecutiveBlockSize`) ELSE 0 END,
  `fixedSlotsJson`,
  `createdAt`,
  `updatedAt`
FROM `TimetableTeachingAssignment`;
