ALTER TABLE `PushCampaign`
  ADD COLUMN `processingStartedAt` DATETIME(3) NULL;

ALTER TABLE `PushDelivery`
  ADD COLUMN `lastRetryAt` DATETIME(3) NULL,
  ADD COLUMN `nextRetryAt` DATETIME(3) NULL;

ALTER TABLE `PushAutomaticRule`
  ADD COLUMN `lastResult` VARCHAR(120) NULL,
  ADD COLUMN `lastErrorCode` VARCHAR(120) NULL;

ALTER TABLE `PushTemplate`
  ADD COLUMN `category` VARCHAR(80) NULL;

CREATE TABLE `PushAutomaticEvent` (
  `id` VARCHAR(191) NOT NULL,
  `ruleId` VARCHAR(191) NOT NULL,
  `eventKey` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PushAutomaticEvent_eventKey_key` (`eventKey`),
  UNIQUE INDEX `PushAutomaticEvent_campaignId_key` (`campaignId`),
  INDEX `PushAutomaticEvent_ruleId_createdAt_idx` (`ruleId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `PushAutomaticEvent_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `PushAutomaticRule` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PushAutomaticEvent_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `PushCampaign` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
