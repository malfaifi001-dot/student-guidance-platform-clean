CREATE TABLE `CurriculumStage` (
  `id` VARCHAR(191) NOT NULL,
  `sourceKey` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CurriculumStage_sourceKey_key` (`sourceKey`),
  INDEX `CurriculumStage_name_idx` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CurriculumTrack` (
  `id` VARCHAR(191) NOT NULL,
  `sourceKey` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `stageId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CurriculumTrack_sourceKey_key` (`sourceKey`),
  UNIQUE INDEX `CurriculumTrack_stageId_name_key` (`stageId`, `name`),
  INDEX `CurriculumTrack_stageId_idx` (`stageId`),
  CONSTRAINT `CurriculumTrack_stageId_fkey` FOREIGN KEY (`stageId`) REFERENCES `CurriculumStage` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CurriculumGrade` (
  `id` VARCHAR(191) NOT NULL,
  `sourceKey` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `stageId` VARCHAR(191) NOT NULL,
  `trackId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `CurriculumGrade_sourceKey_key` (`sourceKey`),
  UNIQUE INDEX `CurriculumGrade_stageId_trackId_name_key` (`stageId`, `trackId`, `name`),
  INDEX `CurriculumGrade_stageId_trackId_idx` (`stageId`, `trackId`),
  CONSTRAINT `CurriculumGrade_stageId_fkey` FOREIGN KEY (`stageId`) REFERENCES `CurriculumStage` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CurriculumGrade_trackId_fkey` FOREIGN KEY (`trackId`) REFERENCES `CurriculumTrack` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CurriculumSemester` (`id` VARCHAR(191) NOT NULL, `sourceKey` VARCHAR(191) NOT NULL, `name` VARCHAR(191) NOT NULL, `gradeId` VARCHAR(191) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL, PRIMARY KEY (`id`), UNIQUE INDEX `CurriculumSemester_sourceKey_key` (`sourceKey`), UNIQUE INDEX `CurriculumSemester_gradeId_name_key` (`gradeId`, `name`), INDEX `CurriculumSemester_gradeId_idx` (`gradeId`), CONSTRAINT `CurriculumSemester_gradeId_fkey` FOREIGN KEY (`gradeId`) REFERENCES `CurriculumGrade` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `CurriculumSubject` (`id` VARCHAR(191) NOT NULL, `sourceKey` VARCHAR(191) NOT NULL, `name` VARCHAR(191) NOT NULL, `isExtra` BOOLEAN NOT NULL DEFAULT false, `semesterId` VARCHAR(191) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL, PRIMARY KEY (`id`), UNIQUE INDEX `CurriculumSubject_sourceKey_key` (`sourceKey`), UNIQUE INDEX `CurriculumSubject_semesterId_name_key` (`semesterId`, `name`), INDEX `CurriculumSubject_semesterId_idx` (`semesterId`), CONSTRAINT `CurriculumSubject_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `CurriculumSemester` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `CurriculumWeek` (`id` VARCHAR(191) NOT NULL, `sourceKey` VARCHAR(191) NOT NULL, `sequence` INTEGER NOT NULL, `subjectId` VARCHAR(191) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL, PRIMARY KEY (`id`), UNIQUE INDEX `CurriculumWeek_sourceKey_key` (`sourceKey`), UNIQUE INDEX `CurriculumWeek_subjectId_sequence_key` (`subjectId`, `sequence`), INDEX `CurriculumWeek_subjectId_sequence_idx` (`subjectId`, `sequence`), CONSTRAINT `CurriculumWeek_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `CurriculumSubject` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `CurriculumLesson` (`id` VARCHAR(191) NOT NULL, `sourceKey` VARCHAR(191) NOT NULL, `text` TEXT NOT NULL, `unit` VARCHAR(191) NULL, `lesson` VARCHAR(191) NULL, `weekId` VARCHAR(191) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL, PRIMARY KEY (`id`), UNIQUE INDEX `CurriculumLesson_sourceKey_key` (`sourceKey`), INDEX `CurriculumLesson_weekId_idx` (`weekId`), CONSTRAINT `CurriculumLesson_weekId_fkey` FOREIGN KEY (`weekId`) REFERENCES `CurriculumWeek` (`id`) ON DELETE CASCADE ON UPDATE CASCADE) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
