CREATE TABLE `TimetableSchedule` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,

  `version` INTEGER NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'GENERATED',
  `isCurrent` BOOLEAN NOT NULL DEFAULT false,

  `score` INTEGER NOT NULL DEFAULT 0,
  `completeness` INTEGER NOT NULL DEFAULT 0,
  `hardViolations` INTEGER NOT NULL DEFAULT 0,
  `softPenalty` INTEGER NOT NULL DEFAULT 0,

  `attemptCount` INTEGER NOT NULL,
  `seed` INTEGER NOT NULL,
  `durationMs` INTEGER NOT NULL DEFAULT 0,

  `engineVersion` VARCHAR(191) NOT NULL,
  `dataFingerprint` VARCHAR(64) NOT NULL,

  `diagnosticsJson` JSON NULL,
  `configJson` JSON NULL,

  `createdById` VARCHAR(191) NULL,

  `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TS_project_version_key` (`projectId`, `version`),
  INDEX `TS_project_current_idx` (`projectId`, `isCurrent`),
  INDEX `TS_project_status_idx` (`projectId`, `status`),
  INDEX `TS_generated_idx` (`generatedAt`),

  PRIMARY KEY (`id`),

  CONSTRAINT `TS_project_fk`
    FOREIGN KEY (`projectId`)
    REFERENCES `TimetableProject`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
)
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableScheduleEntry` (
  `id` VARCHAR(191) NOT NULL,

  `scheduleId` VARCHAR(191) NOT NULL,

  `assignmentId` VARCHAR(191) NULL,

  `teacherId` VARCHAR(191) NOT NULL,
  `teacherName` VARCHAR(191) NOT NULL,

  `classId` VARCHAR(191) NOT NULL,
  `className` VARCHAR(191) NOT NULL,

  `subjectId` VARCHAR(191) NOT NULL,
  `subjectName` VARCHAR(191) NOT NULL,

  `dayId` VARCHAR(191) NOT NULL,
  `dayLabel` VARCHAR(191) NOT NULL,

  `periodId` VARCHAR(191) NOT NULL,
  `periodLabel` VARCHAR(191) NOT NULL,
  `periodOrder` INTEGER NOT NULL,

  `isLocked` BOOLEAN NOT NULL DEFAULT false,
  `source` VARCHAR(191) NOT NULL DEFAULT 'GENERATED',

  `placementScore` INTEGER NOT NULL DEFAULT 0,

  `metadataJson` JSON NULL,

  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TSE_schedule_class_slot_key`
    (`scheduleId`, `classId`, `dayId`, `periodId`),

  UNIQUE INDEX `TSE_schedule_teacher_slot_key`
    (`scheduleId`, `teacherId`, `dayId`, `periodId`),

  INDEX `TSE_schedule_idx` (`scheduleId`),
  INDEX `TSE_teacher_slot_idx` (`teacherId`, `dayId`, `periodId`),
  INDEX `TSE_class_slot_idx` (`classId`, `dayId`, `periodId`),
  INDEX `TSE_subject_idx` (`subjectId`),
  INDEX `TSE_assignment_idx` (`assignmentId`),

  PRIMARY KEY (`id`),

  CONSTRAINT `TSE_schedule_fk`
    FOREIGN KEY (`scheduleId`)
    REFERENCES `TimetableSchedule`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
)
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;