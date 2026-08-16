CREATE TABLE `TimetableProjectHistoryEntry` (
  `id` VARCHAR(191) NOT NULL,
  `projectId` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NULL,
  `revertedByUserId` VARCHAR(191) NULL,
  `actionType` VARCHAR(120) NOT NULL,
  `entityType` VARCHAR(80) NULL,
  `entityId` VARCHAR(191) NULL,
  `state` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `beforeJson` JSON NULL,
  `afterJson` JSON NULL,
  `metadataJson` JSON NULL,
  `revertedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `TimetableProjectHistoryEntry_projectId_createdAt_idx`(`projectId`, `createdAt`),
  INDEX `TimetableProjectHistoryEntry_projectId_state_createdAt_idx`(`projectId`, `state`, `createdAt`),
  INDEX `TimetableProjectHistoryEntry_schoolAccountId_createdAt_idx`(`schoolAccountId`, `createdAt`),
  INDEX `TimetableProjectHistoryEntry_entityId_idx`(`entityId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TimetableProjectHistoryEntry`
  ADD CONSTRAINT `TimetableProjectHistoryEntry_projectId_fkey`
  FOREIGN KEY (`projectId`) REFERENCES `TimetableProject`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TimetableProjectHistoryEntry_schoolAccountId_fkey`
  FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TimetableProjectHistoryEntry_actorUserId_fkey`
  FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `TimetableProjectHistoryEntry_revertedByUserId_fkey`
  FOREIGN KEY (`revertedByUserId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
