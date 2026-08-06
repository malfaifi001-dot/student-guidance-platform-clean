-- Create the legacy timetable workspace foundation required by the later
-- daily-operations and workspace-alignment migrations.

CREATE TABLE `TimetableProject` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `academicYear` VARCHAR(191) NOT NULL,
  `semester` VARCHAR(191) NOT NULL,
  `status` ENUM('DRAFT','READY','GENERATED','APPROVED','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `daysJson` JSON NOT NULL,
  `periodsJson` JSON NOT NULL,
  `settingsJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `TimetableProject_schoolAccountId_idx` (`schoolAccountId`),
  INDEX `TimetableProject_createdById_idx` (`createdById`),
  INDEX `TimetableProject_status_idx` (`status`),
  INDEX `TimetableProject_createdAt_idx` (`createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TimetableProject_schoolAccountId_fkey` FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TimetableProject_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableTeacher` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `specialization` VARCHAR(191) NULL,
  `requiredLoad` INTEGER NOT NULL DEFAULT 24,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `unavailableSlotsJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TimetableTeacher_projectId_userId_key` (`projectId`, `userId`),
  INDEX `TimetableTeacher_projectId_idx` (`projectId`),
  INDEX `TimetableTeacher_userId_idx` (`userId`),
  INDEX `TimetableTeacher_isActive_idx` (`isActive`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TimetableTeacher_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `TimetableProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TimetableTeacher_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableClass` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `stage` VARCHAR(191) NOT NULL,
  `grade` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TimetableClass_projectId_name_key` (`projectId`, `name`),
  INDEX `TimetableClass_projectId_idx` (`projectId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TimetableClass_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `TimetableProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableSubject` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `weeklyPeriods` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TimetableSubject_projectId_name_key` (`projectId`, `name`),
  INDEX `TimetableSubject_projectId_idx` (`projectId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TimetableSubject_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `TimetableProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TimetableTeachingAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `classId` VARCHAR(191) NOT NULL,
  `subjectId` VARCHAR(191) NOT NULL,
  `weeklyPeriods` INTEGER NOT NULL,
  `consecutiveBlockSize` INTEGER NOT NULL DEFAULT 1,
  `fixedSlotsJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `TimetableTeachingAssignment_projectId_teacherId_classId_subjectId_key` (`projectId`, `teacherId`, `classId`, `subjectId`),
  INDEX `TimetableTeachingAssignment_projectId_idx` (`projectId`),
  INDEX `TimetableTeachingAssignment_teacherId_idx` (`teacherId`),
  INDEX `TimetableTeachingAssignment_classId_idx` (`classId`),
  INDEX `TimetableTeachingAssignment_subjectId_idx` (`subjectId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `TimetableTeachingAssignment_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `TimetableProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TimetableTeachingAssignment_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `TimetableTeacher`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TimetableTeachingAssignment_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `TimetableClass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `TimetableTeachingAssignment_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `TimetableSubject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
