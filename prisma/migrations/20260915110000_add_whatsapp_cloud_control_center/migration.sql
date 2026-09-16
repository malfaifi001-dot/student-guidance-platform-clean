CREATE TABLE `WhatsAppCloudConversation` (
  `id` VARCHAR(191) NOT NULL,
  `normalizedPhone` VARCHAR(32) NOT NULL,
  `displayName` VARCHAR(191) NULL,
  `linkedUserId` VARCHAR(191) NULL,
  `lastMessagePreview` TEXT NULL,
  `lastMessageAt` DATETIME(3) NULL,
  `lastInboundAt` DATETIME(3) NULL,
  `unreadCount` INTEGER NOT NULL DEFAULT 0,
  `lastReadAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `WhatsAppCloudConversation_normalizedPhone_key`(`normalizedPhone`),
  INDEX `WhatsAppCloudConversation_lastMessageAt_idx`(`lastMessageAt`),
  INDEX `WhatsAppCloudConversation_linkedUserId_idx`(`linkedUserId`),
  INDEX `WhatsAppCloudConversation_unreadCount_lastMessageAt_idx`(`unreadCount`, `lastMessageAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WhatsAppMetaTemplate` (
  `id` VARCHAR(191) NOT NULL,
  `providerTemplateId` VARCHAR(255) NULL,
  `name` VARCHAR(255) NOT NULL,
  `language` VARCHAR(40) NOT NULL,
  `category` VARCHAR(80) NULL,
  `status` VARCHAR(80) NOT NULL,
  `components` JSON NULL,
  `lastSyncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `providerUpdatedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `WhatsAppMetaTemplate_name_language_key`(`name`, `language`),
  INDEX `WhatsAppMetaTemplate_status_category_idx`(`status`, `category`),
  INDEX `WhatsAppMetaTemplate_lastSyncedAt_idx`(`lastSyncedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WhatsAppCampaign` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `status` ENUM('DRAFT','READY','PROCESSING','COMPLETED','CANCELED','FAILED') NOT NULL DEFAULT 'DRAFT',
  `templateId` VARCHAR(191) NOT NULL,
  `templateLanguage` VARCHAR(40) NOT NULL,
  `templateParameters` JSON NULL,
  `audienceConfig` JSON NULL,
  `estimatedCount` INTEGER NOT NULL DEFAULT 0,
  `sentCount` INTEGER NOT NULL DEFAULT 0,
  `successCount` INTEGER NOT NULL DEFAULT 0,
  `failureCount` INTEGER NOT NULL DEFAULT 0,
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `canceledAt` DATETIME(3) NULL,
  `lastErrorCode` VARCHAR(120) NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `WhatsAppCampaign_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `WhatsAppCampaign_createdById_createdAt_idx`(`createdById`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WhatsAppCloudMessage` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `linkedUserId` VARCHAR(191) NULL,
  `campaignId` VARCHAR(191) NULL,
  `direction` ENUM('INBOUND','OUTBOUND') NOT NULL,
  `status` ENUM('QUEUED','SENT','DELIVERED','READ','FAILED','RECEIVED') NOT NULL,
  `type` ENUM('TEXT','TEMPLATE','UNSUPPORTED') NOT NULL,
  `category` VARCHAR(80) NULL,
  `normalizedSender` VARCHAR(32) NOT NULL,
  `normalizedRecipient` VARCHAR(32) NOT NULL,
  `providerMessageId` VARCHAR(255) NULL,
  `idempotencyKey` VARCHAR(191) NULL,
  `templateName` VARCHAR(255) NULL,
  `templateLanguage` VARCHAR(40) NULL,
  `templateParameters` JSON NULL,
  `bodyPreview` TEXT NULL,
  `unsupportedMetadata` JSON NULL,
  `queuedAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `deliveredAt` DATETIME(3) NULL,
  `readAt` DATETIME(3) NULL,
  `failedAt` DATETIME(3) NULL,
  `providerErrorCode` VARCHAR(120) NULL,
  `providerErrorMessage` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `WhatsAppCloudMessage_providerMessageId_key`(`providerMessageId`),
  UNIQUE INDEX `WhatsAppCloudMessage_idempotencyKey_key`(`idempotencyKey`),
  INDEX `WhatsAppCloudMessage_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
  INDEX `WhatsAppCloudMessage_normalizedRecipient_createdAt_idx`(`normalizedRecipient`, `createdAt`),
  INDEX `WhatsAppCloudMessage_normalizedSender_createdAt_idx`(`normalizedSender`, `createdAt`),
  INDEX `WhatsAppCloudMessage_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `WhatsAppCloudMessage_campaignId_createdAt_idx`(`campaignId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WhatsAppCloudMessageEvent` (
  `id` VARCHAR(191) NOT NULL,
  `messageId` VARCHAR(191) NULL,
  `providerMessageId` VARCHAR(255) NULL,
  `eventType` VARCHAR(80) NOT NULL,
  `status` VARCHAR(80) NULL,
  `eventAt` DATETIME(3) NOT NULL,
  `errorCode` VARCHAR(120) NULL,
  `safeErrorMessage` TEXT NULL,
  `fingerprint` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `WhatsAppCloudMessageEvent_fingerprint_key`(`fingerprint`),
  INDEX `WhatsAppCloudMessageEvent_providerMessageId_idx`(`providerMessageId`),
  INDEX `WhatsAppCloudMessageEvent_messageId_eventAt_idx`(`messageId`, `eventAt`),
  INDEX `WhatsAppCloudMessageEvent_eventType_createdAt_idx`(`eventType`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WhatsAppCampaignRecipient` (
  `id` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NOT NULL,
  `normalizedPhone` VARCHAR(32) NOT NULL,
  `linkedUserId` VARCHAR(191) NULL,
  `status` ENUM('PENDING','PROCESSING','SENT','FAILED','CANCELED') NOT NULL DEFAULT 'PENDING',
  `outboundMessageId` VARCHAR(191) NULL,
  `attemptedAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `failedAt` DATETIME(3) NULL,
  `failureCode` VARCHAR(120) NULL,
  `safeFailureMessage` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `WhatsAppCampaignRecipient_campaignId_normalizedPhone_key`(`campaignId`, `normalizedPhone`),
  UNIQUE INDEX `WhatsAppCampaignRecipient_outboundMessageId_key`(`outboundMessageId`),
  INDEX `WhatsAppCampaignRecipient_campaignId_status_idx`(`campaignId`, `status`),
  INDEX `WhatsAppCampaignRecipient_linkedUserId_idx`(`linkedUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `WhatsAppContactConsent` (
  `id` VARCHAR(191) NOT NULL,
  `normalizedPhone` VARCHAR(32) NOT NULL,
  `linkedUserId` VARCHAR(191) NULL,
  `marketingOptIn` BOOLEAN NOT NULL DEFAULT false,
  `consentGrantedAt` DATETIME(3) NULL,
  `consentSource` VARCHAR(120) NULL,
  `consentRevokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `WhatsAppContactConsent_normalizedPhone_key`(`normalizedPhone`),
  INDEX `WhatsAppContactConsent_marketingOptIn_consentGrantedAt_idx`(`marketingOptIn`, `consentGrantedAt`),
  INDEX `WhatsAppContactConsent_linkedUserId_idx`(`linkedUserId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `WhatsAppCloudConversation` ADD CONSTRAINT `WhatsAppCloudConversation_linkedUserId_fkey` FOREIGN KEY (`linkedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `WhatsAppCampaign` ADD CONSTRAINT `WhatsAppCampaign_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `WhatsAppMetaTemplate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `WhatsAppCampaign` ADD CONSTRAINT `WhatsAppCampaign_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `WhatsAppCloudMessage` ADD CONSTRAINT `WhatsAppCloudMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `WhatsAppCloudConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WhatsAppCloudMessage` ADD CONSTRAINT `WhatsAppCloudMessage_linkedUserId_fkey` FOREIGN KEY (`linkedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `WhatsAppCloudMessage` ADD CONSTRAINT `WhatsAppCloudMessage_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `WhatsAppCampaign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `WhatsAppCloudMessageEvent` ADD CONSTRAINT `WhatsAppCloudMessageEvent_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `WhatsAppCloudMessage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `WhatsAppCampaignRecipient` ADD CONSTRAINT `WhatsAppCampaignRecipient_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `WhatsAppCampaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `WhatsAppCampaignRecipient` ADD CONSTRAINT `WhatsAppCampaignRecipient_linkedUserId_fkey` FOREIGN KEY (`linkedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `WhatsAppCampaignRecipient` ADD CONSTRAINT `WhatsAppCampaignRecipient_outboundMessageId_fkey` FOREIGN KEY (`outboundMessageId`) REFERENCES `WhatsAppCloudMessage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `WhatsAppContactConsent` ADD CONSTRAINT `WhatsAppContactConsent_linkedUserId_fkey` FOREIGN KEY (`linkedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
