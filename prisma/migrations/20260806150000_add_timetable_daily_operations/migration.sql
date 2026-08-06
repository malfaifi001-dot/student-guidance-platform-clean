CREATE TABLE `TimetableWaitingPolicy` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `candidateCount` INTEGER NOT NULL DEFAULT 6,
  `maxDailySubstitutions` INTEGER NOT NULL DEFAULT 1,
  `maxWeeklySubstitutions` INTEGER NOT NULL DEFAULT 5,
  `allowBeforeFirstLesson` BOOLEAN NOT NULL DEFAULT false,
  `allowAfterLastLesson` BOOLEAN NOT NULL DEFAULT false,
  `allowInsideGap` BOOLEAN NOT NULL DEFAULT true,
  `preferInsideGap` BOOLEAN NOT NULL DEFAULT true,
  `allowOnGoldenDay` BOOLEAN NOT NULL DEFAULT false,
  `goldenDayEmergency` BOOLEAN NOT NULL DEFAULT false,
  `allowAfterLateArrival` BOOLEAN NOT NULL DEFAULT true,
  `excludeLateArrivalDay` BOOLEAN NOT NULL DEFAULT false,
  `allowBeforeEarlyDeparture` BOOLEAN NOT NULL DEFAULT true,
  `preventConsecutiveSubstitutions` BOOLEAN NOT NULL DEFAULT true,
  `preventFirstPeriod` BOOLEAN NOT NULL DEFAULT false,
  `preventLastPeriod` BOOLEAN NOT NULL DEFAULT false,
  `requireMatchingSpecialty` BOOLEAN NOT NULL DEFAULT false,
  `preferMatchingSpecialty` BOOLEAN NOT NULL DEFAULT true,
  `weeklyLoadWeight` INTEGER NOT NULL DEFAULT 100,
  `weeklyWaitingWeight` INTEGER NOT NULL DEFAULT 40,
  `dailyWaitingWeight` INTEGER NOT NULL DEFAULT 60,
  `gapPreferenceWeight` INTEGER NOT NULL DEFAULT 20,
  `specialtyWeight` INTEGER NOT NULL DEFAULT 15,
  `firstLastFairnessWeight` INTEGER NOT NULL DEFAULT 10,
  `settingsJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TimetableWaitingPolicy_projectId_key` (`projectId`),
  INDEX `TimetableWaitingPolicy_projectId_idx` (`projectId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableDailyAbsence` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `absenceDate` DATE NOT NULL,
  `absenceType` ENUM(
    'FULL_DAY',
    'SELECTED_PERIODS',
    'LATE_ARRIVAL',
    'EARLY_DEPARTURE'
  ) NOT NULL,
  `status` ENUM(
    'DRAFT',
    'ACTIVE',
    'CLOSED',
    'CANCELED'
  ) NOT NULL DEFAULT 'ACTIVE',
  `periodIdsJson` JSON NULL,
  `arrivalPeriodId` VARCHAR(191) NULL,
  `departurePeriodId` VARCHAR(191) NULL,
  `reason` TEXT NULL,
  `note` TEXT NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TimetableDailyAbsence_projectId_teacherId_absenceDate_key`
    (`projectId`, `teacherId`, `absenceDate`),
  INDEX `TimetableDailyAbsence_schoolAccountId_idx` (`schoolAccountId`),
  INDEX `TimetableDailyAbsence_projectId_idx` (`projectId`),
  INDEX `TimetableDailyAbsence_teacherId_idx` (`teacherId`),
  INDEX `TimetableDailyAbsence_absenceDate_idx` (`absenceDate`),
  INDEX `TimetableDailyAbsence_status_idx` (`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableSubstitution` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `absenceId` VARCHAR(191) NOT NULL,
  `substitutionDate` DATE NOT NULL,
  `originalSessionId` VARCHAR(191) NOT NULL,
  `dayId` VARCHAR(191) NOT NULL,
  `periodId` VARCHAR(191) NOT NULL,
  `classId` VARCHAR(191) NOT NULL,
  `className` VARCHAR(191) NOT NULL,
  `subjectId` VARCHAR(191) NOT NULL,
  `subjectName` VARCHAR(191) NOT NULL,
  `originalTeacherId` VARCHAR(191) NOT NULL,
  `substituteTeacherId` VARCHAR(191) NULL,
  `status` ENUM(
    'PENDING',
    'SUGGESTED',
    'ASSIGNED',
    'NOTIFIED',
    'COMPLETED',
    'DECLINED',
    'REASSIGNED',
    'CANCELED'
  ) NOT NULL DEFAULT 'PENDING',
  `candidateRank` INTEGER NULL,
  `candidateScore` INTEGER NULL,
  `candidatesJson` JSON NULL,
  `selectionReason` TEXT NULL,
  `overrideReason` TEXT NULL,
  `assignedAt` DATETIME(3) NULL,
  `notifiedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `declinedAt` DATETIME(3) NULL,
  `canceledAt` DATETIME(3) NULL,
  `createdById` VARCHAR(191) NULL,
  `updatedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TimetableSubstitution_project_date_session_key`
    (`projectId`, `substitutionDate`, `originalSessionId`),
  INDEX `TimetableSubstitution_schoolAccountId_idx` (`schoolAccountId`),
  INDEX `TimetableSubstitution_projectId_idx` (`projectId`),
  INDEX `TimetableSubstitution_absenceId_idx` (`absenceId`),
  INDEX `TimetableSubstitution_substitutionDate_idx` (`substitutionDate`),
  INDEX `TimetableSubstitution_originalTeacherId_idx` (`originalTeacherId`),
  INDEX `TimetableSubstitution_substituteTeacherId_idx` (`substituteTeacherId`),
  INDEX `TimetableSubstitution_status_idx` (`status`),
  INDEX `TimetableSubstitution_dayId_periodId_idx` (`dayId`, `periodId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableSupervisionDuty` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `dutyType` ENUM(
    'MORNING',
    'BREAK',
    'GATE',
    'END_OF_DAY',
    'PRAYER',
    'BUS',
    'FLOOR',
    'CUSTOM'
  ) NOT NULL,
  `status` ENUM(
    'DRAFT',
    'ASSIGNED',
    'COMPLETED',
    'CANCELED'
  ) NOT NULL DEFAULT 'DRAFT',
  `dayId` VARCHAR(191) NOT NULL,
  `periodId` VARCHAR(191) NULL,
  `startTime` VARCHAR(191) NULL,
  `endTime` VARCHAR(191) NULL,
  `location` VARCHAR(191) NULL,
  `requiredTeachers` INTEGER NOT NULL DEFAULT 1,
  `note` TEXT NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `TimetableSupervisionDuty_schoolAccountId_idx` (`schoolAccountId`),
  INDEX `TimetableSupervisionDuty_projectId_idx` (`projectId`),
  INDEX `TimetableSupervisionDuty_dayId_idx` (`dayId`),
  INDEX `TimetableSupervisionDuty_periodId_idx` (`periodId`),
  INDEX `TimetableSupervisionDuty_dutyType_idx` (`dutyType`),
  INDEX `TimetableSupervisionDuty_status_idx` (`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableSupervisionAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `dutyId` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `isPrimary` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  `note` TEXT NULL,

  UNIQUE INDEX `TimetableSupervisionAssignment_dutyId_teacherId_key`
    (`dutyId`, `teacherId`),
  INDEX `TimetableSupervisionAssignment_dutyId_idx` (`dutyId`),
  INDEX `TimetableSupervisionAssignment_teacherId_idx` (`teacherId`),
  INDEX `TimetableSupervisionAssignment_isPrimary_idx` (`isPrimary`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TimetableWaitingPolicy`
  ADD CONSTRAINT `TimetableWaitingPolicy_projectId_fkey`
  FOREIGN KEY (`projectId`)
  REFERENCES `TimetableProject`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `TimetableDailyAbsence`
  ADD CONSTRAINT `TimetableDailyAbsence_schoolAccountId_fkey`
  FOREIGN KEY (`schoolAccountId`)
  REFERENCES `SchoolAccount`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `TimetableDailyAbsence_projectId_fkey`
  FOREIGN KEY (`projectId`)
  REFERENCES `TimetableProject`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `TimetableDailyAbsence_teacherId_fkey`
  FOREIGN KEY (`teacherId`)
  REFERENCES `TimetableTeacher`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `TimetableSubstitution`
  ADD CONSTRAINT `TimetableSubstitution_schoolAccountId_fkey`
  FOREIGN KEY (`schoolAccountId`)
  REFERENCES `SchoolAccount`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `TimetableSubstitution_projectId_fkey`
  FOREIGN KEY (`projectId`)
  REFERENCES `TimetableProject`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `TimetableSubstitution_absenceId_fkey`
  FOREIGN KEY (`absenceId`)
  REFERENCES `TimetableDailyAbsence`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `TimetableSubstitution_originalTeacherId_fkey`
  FOREIGN KEY (`originalTeacherId`)
  REFERENCES `TimetableTeacher`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `TimetableSubstitution_substituteTeacherId_fkey`
  FOREIGN KEY (`substituteTeacherId`)
  REFERENCES `TimetableTeacher`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE `TimetableSupervisionDuty`
  ADD CONSTRAINT `TimetableSupervisionDuty_schoolAccountId_fkey`
  FOREIGN KEY (`schoolAccountId`)
  REFERENCES `SchoolAccount`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `TimetableSupervisionDuty_projectId_fkey`
  FOREIGN KEY (`projectId`)
  REFERENCES `TimetableProject`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE `TimetableSupervisionAssignment`
  ADD CONSTRAINT `TimetableSupervisionAssignment_dutyId_fkey`
  FOREIGN KEY (`dutyId`)
  REFERENCES `TimetableSupervisionDuty`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT `TimetableSupervisionAssignment_teacherId_fkey`
  FOREIGN KEY (`teacherId`)
  REFERENCES `TimetableTeacher`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
