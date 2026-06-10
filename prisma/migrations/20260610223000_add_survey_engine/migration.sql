-- Add Survey Engine

CREATE TABLE `Survey` (
  `id` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `createdById` VARCHAR(191) NULL,
  `serviceId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `audienceType` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
  `ownerRole` VARCHAR(191) NULL,
  `boardPath` VARCHAR(191) NULL,
  `isAnonymous` BOOLEAN NOT NULL DEFAULT false,
  `token` VARCHAR(191) NOT NULL,
  `status` ENUM('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `startsAt` DATETIME(3) NULL,
  `endsAt` DATETIME(3) NULL,
  `publishedAt` DATETIME(3) NULL,
  `closedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `Survey_token_key`(`token`),
  INDEX `Survey_schoolAccountId_idx`(`schoolAccountId`),
  INDEX `Survey_createdById_idx`(`createdById`),
  INDEX `Survey_serviceId_idx`(`serviceId`),
  INDEX `Survey_status_idx`(`status`),
  INDEX `Survey_audienceType_idx`(`audienceType`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SurveyQuestion` (
  `id` VARCHAR(191) NOT NULL,
  `surveyId` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `type` ENUM('TEXT', 'TEXTAREA', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'YES_NO', 'RATING', 'SCALE', 'NUMBER', 'DATE') NOT NULL,
  `helpText` TEXT NULL,
  `isRequired` BOOLEAN NOT NULL DEFAULT false,
  `order` INTEGER NOT NULL,
  `scaleMin` INTEGER NULL,
  `scaleMax` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `SurveyQuestion_surveyId_key_key`(`surveyId`, `key`),
  INDEX `SurveyQuestion_surveyId_idx`(`surveyId`),
  INDEX `SurveyQuestion_order_idx`(`order`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SurveyOption` (
  `id` VARCHAR(191) NOT NULL,
  `questionId` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `value` VARCHAR(191) NOT NULL,
  `order` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  INDEX `SurveyOption_questionId_idx`(`questionId`),
  INDEX `SurveyOption_order_idx`(`order`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SurveyResponse` (
  `id` VARCHAR(191) NOT NULL,
  `surveyId` VARCHAR(191) NOT NULL,
  `schoolAccountId` VARCHAR(191) NOT NULL,
  `respondentType` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
  `respondentName` VARCHAR(191) NULL,
  `respondentPhone` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `SurveyResponse_surveyId_idx`(`surveyId`),
  INDEX `SurveyResponse_schoolAccountId_idx`(`schoolAccountId`),
  INDEX `SurveyResponse_respondentType_idx`(`respondentType`),
  INDEX `SurveyResponse_submittedAt_idx`(`submittedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SurveyAnswer` (
  `id` VARCHAR(191) NOT NULL,
  `responseId` VARCHAR(191) NOT NULL,
  `questionId` VARCHAR(191) NOT NULL,
  `value` TEXT NULL,
  `jsonValue` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `SurveyAnswer_responseId_questionId_key`(`responseId`, `questionId`),
  INDEX `SurveyAnswer_questionId_idx`(`questionId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Survey`
  ADD CONSTRAINT `Survey_schoolAccountId_fkey`
  FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Survey`
  ADD CONSTRAINT `Survey_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Survey`
  ADD CONSTRAINT `Survey_serviceId_fkey`
  FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SurveyQuestion`
  ADD CONSTRAINT `SurveyQuestion_surveyId_fkey`
  FOREIGN KEY (`surveyId`) REFERENCES `Survey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SurveyOption`
  ADD CONSTRAINT `SurveyOption_questionId_fkey`
  FOREIGN KEY (`questionId`) REFERENCES `SurveyQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SurveyResponse`
  ADD CONSTRAINT `SurveyResponse_surveyId_fkey`
  FOREIGN KEY (`surveyId`) REFERENCES `Survey`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SurveyResponse`
  ADD CONSTRAINT `SurveyResponse_schoolAccountId_fkey`
  FOREIGN KEY (`schoolAccountId`) REFERENCES `SchoolAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SurveyAnswer`
  ADD CONSTRAINT `SurveyAnswer_responseId_fkey`
  FOREIGN KEY (`responseId`) REFERENCES `SurveyResponse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SurveyAnswer`
  ADD CONSTRAINT `SurveyAnswer_questionId_fkey`
  FOREIGN KEY (`questionId`) REFERENCES `SurveyQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;