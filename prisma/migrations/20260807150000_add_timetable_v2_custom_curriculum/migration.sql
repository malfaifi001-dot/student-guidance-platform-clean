-- Add reusable school-level custom curriculum templates and a school-scoped
-- subject bank used by the Timetable V2 custom study plan flow.

CREATE TABLE `TimetableSubjectBankEntry` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TimetableSubjectBankEntry_schoolAccountId_name_key` (`schoolAccountId`, `name`),
  INDEX `TimetableSubjectBankEntry_schoolAccountId_idx` (`schoolAccountId`),

  PRIMARY KEY (`id`),

  CONSTRAINT `TimetableSubjectBankEntry_schoolAccountId_fkey`
    FOREIGN KEY (`schoolAccountId`)
    REFERENCES `SchoolAccount`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableCurriculumTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `stageId` VARCHAR(191) NULL,
  `gradeId` VARCHAR(191) NULL,
  `semesterId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `TimetableCurriculumTemplate_schoolAccountId_idx` (`schoolAccountId`),
  INDEX `TimetableCurriculumTemplate_gradeId_idx` (`gradeId`),

  PRIMARY KEY (`id`),

  CONSTRAINT `TimetableCurriculumTemplate_schoolAccountId_fkey`
    FOREIGN KEY (`schoolAccountId`)
    REFERENCES `SchoolAccount`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableCurriculumTemplateItem` (
  `id` VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NOT NULL,
  `subjectName` VARCHAR(191) NOT NULL,
  `weeklyLessons` INTEGER NOT NULL,
  `singlePeriods` INTEGER NOT NULL,
  `doublePeriods` INTEGER NOT NULL,
  `sortOrder` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TimetableCurriculumTemplateItem_templateId_subjectName_key` (`templateId`, `subjectName`),
  INDEX `TimetableCurriculumTemplateItem_templateId_idx` (`templateId`),

  PRIMARY KEY (`id`),

  CONSTRAINT `TimetableCurriculumTemplateItem_templateId_fkey`
    FOREIGN KEY (`templateId`)
    REFERENCES `TimetableCurriculumTemplate`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
